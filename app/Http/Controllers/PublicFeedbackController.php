<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Contracts\Encryption\DecryptException;
use App\Models\Form;
use App\Models\Department;
use Illuminate\Support\Facades\Mail;
use App\Mail\HarassmentAlertMail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Log;
use App\Models\Feedback;
use App\Services\GeminiSentimentService;
use Inertia\Inertia;

class PublicFeedbackController extends Controller
{
   public function show(Request $request)
    {
        if (!$request->has('token')) {
            abort(403, 'Access Denied: Missing secure token.');
        }

        $token = $request->token;
        $qrId = null;
        $formId = null;

        try {
            $decrypted = Crypt::decryptString($token);
            if (is_numeric($decrypted)) {
                $formId = $decrypted;
            }
        } catch (DecryptException $e) {
            // Decryption failed. 
        }

        if (!$formId) {
            $qrCode = \App\Models\QrCode::where('qr_token', $token)
                            ->where('is_active', 1)
                            ->first();

            if (!$qrCode) {
                abort(404, 'Access Denied: This link is invalid or has been deactivated.');
            }

            $qrId = $qrCode->qr_id;

            $activeForm = Form::where('department_id', $qrCode->department_id)
                        ->where('status', 'Active')
                        ->first();

            if (!$activeForm) {
                abort(404, 'There is no active feedback form for this department at the moment.');
            }
            
            $formId = $activeForm->form_id;
        }

        $fullForm = Form::getActiveForm($formId);

        if (!$fullForm) {
            abort(404, 'No active feedback form is currently available for this link.');
        }

        // --- FETCH AND CACHE REGIONS FOR 30 DAYS ---
        $phRegions = Cache::remember('ph_regions', 2592000, function () {
            try {
                $response = Http::timeout(5)->get('https://psgc.gitlab.io/api/regions/');
                if ($response->successful()) {
                    $data = $response->json();
                    // Sort alphabetically by region name
                    usort($data, fn($a, $b) => strcmp($a['name'], $b['name']));
                    return $data;
                }
            } catch (\Exception $e) {
                // Safe fallback if the API is ever down
                return [['name' => 'Central Luzon', 'regionName' => 'Region III']];
            }
            return [];
        });

        // FETCH DEPARTMENT AND EAGER LOAD SERVICE PROVIDERS
        $department = Department::with('service_providers')
            ->where('department_id', $fullForm->department_id)
            ->first();

        return Inertia::render('Feedback/Index', [
            'form'             => $fullForm,
            'departmentName'   => $department ? $department->department_name : 'General',
            'serviceProviders' => $department ? $department->service_providers : [], // PASS TO FRONTEND
            'isCC'             => $fullForm->form_type !== 'Non-CC',
            'steps'            => $fullForm->getFormattedSteps(),
            'qr_id'            => $qrId,
            'ph_regions'       => $phRegions // PASS CACHED REGIONS TO FRONTEND
        ]);
    }

 /**
     * Handles the feedback submission with Multi-Select Payload Splitting and Email Alerts.
     */
   public function store(Request $request)
    {
        // 1. Validate Request
        $validated = $request->validate([
            'form_id'          => 'required|integer|exists:forms,form_id',
            'department_id'    => 'required|integer|exists:department,department_id',
            'email_address'    => 'required|email|max:255',
            'transaction_date' => 'required|date|before_or_equal:today',
            'answers'          => 'required|array',
        ]);

        // --- SPAM PREVENTION 1: IP Rate Limiting ---
        // Prevent an IP from submitting more than 5 forms per hour to stop bots or fake email spam
        if (RateLimiter::tooManyAttempts('feedback-submission:' . $request->ip(), 5)) {
            return back()->withErrors(['spam' => 'Too many submissions from this device. Please try again later.']);
        }
        RateLimiter::hit('feedback-submission:' . $request->ip(), 3600); // Lockout for 1 hour after 5 hits

        // --- SPAM PREVENTION 2: Email & Department Daily Limit ---
        // Prevent the exact same email from evaluating the exact same department multiple times in one day
        $alreadySubmittedToday = Feedback::where('email_address', $validated['email_address'])
            ->where('department_id', $validated['department_id'])
            ->whereDate('created_at', \Carbon\Carbon::today())
            ->exists();

        if ($alreadySubmittedToday) {
            return back()->withErrors(['email_address' => 'You have already submitted an evaluation for this department today.']);
        }

        // 2. Identify selected services for Payload Splitting
        $servicesAvailed = [];
        // ... rest of your existing code
        $serviceFieldId = null;
        
        $fullForm = \App\Models\Form::getActiveForm($validated['form_id']);
        
        if ($fullForm) {
            foreach ($fullForm->getFormattedSteps() as $step => $fields) {
                foreach ($fields as $field) {
                    $fieldId = is_object($field) ? $field->field_id : $field['field_id'];
                    $fieldLabel = strtolower(is_object($field) ? $field->field_label : $field['field_label']);
                    
                    if (str_contains($fieldLabel, 'service availed')) {
                        $serviceFieldId = $fieldId;
                        break 2;
                    }
                }
            }
        }

        if ($serviceFieldId && isset($validated['answers'][$serviceFieldId])) {
            $rawServices = $validated['answers'][$serviceFieldId];
            if (is_array($rawServices)) {
                $servicesAvailed = $rawServices;
            } elseif (is_string($rawServices)) {
                $decoded = json_decode($rawServices, true);
                if (is_array($decoded)) {
                    $servicesAvailed = $decoded;
                } elseif (str_contains($rawServices, ',')) {
                    $servicesAvailed = array_map('trim', explode(',', $rawServices));
                } else {
                    $servicesAvailed = [$rawServices];
                }
            }
        }

        if (empty($servicesAvailed)) {
            $servicesAvailed = ['General Transaction'];
        }

        // 3. Extract qualitative text & Check for Harassment
        $textAnswers = [];
        $placeholders = ['n/a', 'na', 'none', 'wala', 'no', 'none so far', 'ok', 'okay', 'n / a', 'none po', 'nothing'];
        $qualitativeFieldIds = [];
        
        $hasHarassment = false;
        $harassmentDetails = 'No detailed narrative provided.';

        if ($fullForm) {
            foreach ($fullForm->getFormattedSteps() as $step => $fields) {
                foreach ($fields as $field) {
                    $fieldId = is_object($field) ? $field->field_id : $field['field_id'];
                    $inputType = is_object($field) ? $field->input_type : $field['input_type'];
                    $fieldLabel = strtolower(is_object($field) ? $field->field_label : $field['field_label']);
                    
                    $isHarassmentQuestion = str_contains($fieldLabel, 'harassment') && !str_contains($fieldLabel, 'detail');
                    $isHarassmentDetailsField = str_contains($fieldLabel, 'if yes') || str_contains($fieldLabel, 'detail');
                    $isSuggestion = str_contains($fieldLabel, 'suggestion') || str_contains($fieldLabel, 'comment') || str_contains($fieldLabel, 'remark');

                    if ($inputType === 'text' && ($isSuggestion || $isHarassmentDetailsField)) {
                        $qualitativeFieldIds[] = $fieldId;
                    }

                    // TRIGGER: Check if the user selected "Yes" for Harassment
                    if ($isHarassmentQuestion && isset($validated['answers'][$fieldId])) {
                        if (strtolower(trim($validated['answers'][$fieldId])) === 'yes') {
                            $hasHarassment = true;
                        }
                    }

                    // CAPTURE: Extract the harassment explanation for the email body
                    if ($isHarassmentDetailsField && isset($validated['answers'][$fieldId])) {
                        $detailsText = trim($validated['answers'][$fieldId]);
                        if (!empty($detailsText) && !in_array(strtolower($detailsText), $placeholders)) {
                            $harassmentDetails = $detailsText;
                        }
                    }
                }
            }
        }

        foreach ($validated['answers'] as $fieldId => $answer) {
            if (in_array($fieldId, $qualitativeFieldIds) && is_string($answer)) {
                $clean = trim(strtolower($answer));
                if (!empty($clean) && !is_numeric($clean) && !in_array($clean, $placeholders) && strlen($clean) > 3) {
                    $textAnswers[] = $answer;
                }
            }
        }

        // 4. Perform AI Analysis
        if (!empty($textAnswers)) {
            $feedbackText = implode(" | ", $textAnswers);
            $aiAnalysis = GeminiSentimentService::analyze($feedbackText);

            $validated['sentiment']       = $aiAnalysis['sentiment_category'] ?? 'Neutral';
            $validated['ai_confidence']   = (int) ($aiAnalysis['confidence_score'] ?? 80);
        } else {
            $validated['sentiment']       = 'Neutral';
            $validated['ai_confidence']   = 100;
        }

        // 5. SPLIT AND SAVE: Loop through each selected service and clone the submission
        foreach ($servicesAvailed as $serviceName) {
            $clonedPayload = $validated;
            if ($serviceFieldId) {
                $clonedPayload['answers'][$serviceFieldId] = $serviceName;
            }
            Feedback::processSubmission($clonedPayload);
        }

        // 6. URGENT ALERT: Send Harassment Email
        if ($hasHarassment) {
            $dept = Department::find($validated['department_id']);
            $deptName = $dept ? $dept->department_name : 'General Office';
            
            // Get all Feedback Committee emails
            $recipients = \App\Models\Account::where('role', 'LIKE', '%Feedback%Committee%')->pluck('email')->toArray();
            
            // Get Focal Person email
            if ($dept && $dept->focal_person_id) {
                $focalPerson = \App\Models\Account::where('user_id', $dept->focal_person_id)->first();
                if ($focalPerson && !empty($focalPerson->email)) {
                    $recipients[] = $focalPerson->email;
                }
            }

            $recipients = array_unique(array_filter($recipients));

            if (!empty($recipients)) {
                $emailData = [
                    'department_name'    => $deptName,
                    'transaction_date'   => $validated['transaction_date'],
                    'harassment_details' => $harassmentDetails,
                ];
                
                try {
                    Mail::to($recipients)->send(new HarassmentAlertMail($emailData));
                } catch (\Exception $e) {
                    // Log error but don't crash the form submission for the user!
                    Log::error('Harassment Alert Email Failed: ' . $e->getMessage());
                }
            }
        }

        // 7. Return HTTP Response
        return back()->with('success', 'Your feedback has been successfully submitted!');
    }
}