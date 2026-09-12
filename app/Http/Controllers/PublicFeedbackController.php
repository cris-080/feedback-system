<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Contracts\Encryption\DecryptException;
use App\Models\Form;
use App\Models\Department;
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

        $fullForm = \App\Models\Form::getActiveForm($formId);

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
     * Handles the feedback submission.
     */
    public function store(Request $request)
    {
        // 1. Validate Request (Added transaction_date)
        $validated = $request->validate([
            'form_id'          => 'required|integer|exists:forms,form_id',
            'department_id'    => 'required|integer|exists:department,department_id',
            'email_address'    => 'required|email|max:255',
            'transaction_date' => 'required|date|before_or_equal:today', // Validates past/current date
            'answers'          => 'required|array',
        ]);

        // 2. Extract qualitative text (suggestions / comments / harassment details)
        $textAnswers = [];
        $placeholders = ['n/a', 'na', 'none', 'wala', 'no', 'none so far', 'ok', 'okay', 'n / a', 'none po', 'nothing'];

        // Retrieve form fields to explicitly pinpoint open-ended qualitative questions
        $fullForm = \App\Models\Form::getActiveForm($validated['form_id']);
        $qualitativeFieldIds = [];

        if ($fullForm) {
            foreach ($fullForm->getFormattedSteps() as $step => $fields) {
                foreach ($fields as $field) {
                    $fieldId = is_object($field) ? $field->field_id : $field['field_id'];
                    $inputType = is_object($field) ? $field->input_type : $field['input_type'];
                    $fieldLabel = strtolower(is_object($field) ? $field->field_label : $field['field_label']);
                    
                    // Identify fields meant for actual comments/details
                    $isHarassmentDetails = str_contains($fieldLabel, 'if yes') || str_contains($fieldLabel, 'detail');
                    $isSuggestion = str_contains($fieldLabel, 'suggestion') || str_contains($fieldLabel, 'comment') || str_contains($fieldLabel, 'remark');

                    if ($inputType === 'text' && ($isSuggestion || $isHarassmentDetails)) {
                        $qualitativeFieldIds[] = $fieldId;
                    }
                }
            }
        }

        foreach ($validated['answers'] as $fieldId => $answer) {
            // ONLY process answers that belong to the targeted qualitative text fields
            if (in_array($fieldId, $qualitativeFieldIds) && is_string($answer)) {
                $clean = trim(strtolower($answer));
                
                // If it's not a numeric scale score (1-5) and not a placeholder, keep it for NLP analysis
                if (!empty($clean) && !is_numeric($clean) && !in_array($clean, $placeholders) && strlen($clean) > 3) {
                    $textAnswers[] = $answer;
                }
            }
        }

        // 3. Perform AI Analysis or apply Neutral default
        if (!empty($textAnswers)) {
            // Concatenate meaningful text comments for Gemini
            $feedbackText = implode(" | ", $textAnswers);
            $aiAnalysis = GeminiSentimentService::analyze($feedbackText);

            $validated['sentiment']       = $aiAnalysis['sentiment_category'] ?? 'Neutral';
            $validated['ai_confidence']   = (int) ($aiAnalysis['confidence_score'] ?? 80);
            $validated['theme']           = $aiAnalysis['key_theme'] ?? 'General Feedback';
            $validated['english_summary'] = $aiAnalysis['translated_summary'] ?? 'Standard feedback submitted.';
        } else {
            // User left text blank or entered a placeholder -> Fallback to Neutral
            $validated['sentiment']       = 'Neutral';
            $validated['ai_confidence']   = 100;
            $validated['theme']           = 'No Comments Provided';
            $validated['english_summary'] = 'The respondent completed the transaction without providing qualitative comments.';
        }

        // 4. Delegate Database Transaction to the Model
        Feedback::processSubmission($validated);

        // 5. Return HTTP Response
        return back()->with('success', 'Your feedback has been successfully submitted!');
    }
}