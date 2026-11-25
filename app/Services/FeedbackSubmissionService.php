<?php

namespace App\Services;

use App\Models\Form;
use App\Models\Department;
use App\Models\Feedback;
use Illuminate\Support\Facades\Mail;
use App\Mail\HarassmentAlertMail;
use Illuminate\Support\Facades\Log;
use App\Services\GeminiSentimentService;

class FeedbackSubmissionService
{
    /**
     * Processes the feedback submission, handling payload splitting, 
     * AI sentiment analysis, and harassment alerts.
     */
    public static function process(array $validated)
    {
        // 1. Identify selected services for Payload Splitting
        $servicesAvailed = [];
        $serviceFieldId = null;
        
        $fullForm = Form::getActiveForm($validated['form_id']);
        
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

        // 2. Extract qualitative text & Check for Harassment
        $textAnswers = [];
        $placeholders = ['n/a', 'na', 'none', 'wala', 'no', 'none so far', 'ok', 'okay', 'n / a', 'none po', 'nothing'];
        $qualitativeFieldIds = [];
        
        $hasHarassment = false;
        $harassmentDetails = 'No detailed narrative provided.';
        $serviceProviderName = null;
        $serviceProviderPosition = null;
        $providerPlaceholders = ['i do not know', "i don't know", 'unknown', 'n/a', 'na', 'none', 'wala', 'nothing'];

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

                    if (str_contains($fieldLabel, 'name of service provider') && isset($validated['answers'][$fieldId]) && is_string($validated['answers'][$fieldId])) {
                        $rawProvider = trim($validated['answers'][$fieldId]);
                        if ($rawProvider !== '' && !in_array(strtolower($rawProvider), $providerPlaceholders, true)) {
                            $serviceProviderName = $rawProvider;
                        }
                    }

                    if (str_contains($fieldLabel, 'position of service provider') && isset($validated['answers'][$fieldId]) && is_string($validated['answers'][$fieldId])) {
                        $rawPosition = trim($validated['answers'][$fieldId]);
                        if ($rawPosition !== '' && !in_array(strtolower($rawPosition), $providerPlaceholders, true)) {
                            $serviceProviderPosition = $rawPosition;
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

        // 3. Perform AI Analysis
        if (!empty($textAnswers)) {
            $feedbackText = implode(" | ", $textAnswers);
            $aiAnalysis = GeminiSentimentService::analyze($feedbackText);

            $validated['sentiment']       = $aiAnalysis['sentiment_category'] ?? 'Neutral';
            $validated['ai_confidence']   = (int) ($aiAnalysis['confidence_score'] ?? 80);
        } else {
            $validated['sentiment']       = 'Neutral';
            $validated['ai_confidence']   = 100;
        }

        // 4. SPLIT AND SAVE: Loop through each selected service and clone the submission
        foreach ($servicesAvailed as $serviceName) {
            $clonedPayload = $validated;
            if ($serviceFieldId) {
                $clonedPayload['answers'][$serviceFieldId] = $serviceName;
            }
            Feedback::processSubmission($clonedPayload);
        }

        // 5. URGENT ALERT: Send Harassment Email
        if ($hasHarassment) {
            self::sendHarassmentAlert($validated, $harassmentDetails, $serviceProviderName, $serviceProviderPosition);
        }
    }

    /**
     * Handles compiling recipients and dispatching the harassment alert email.
     */
    private static function sendHarassmentAlert(
        array $validated,
        string $harassmentDetails,
        ?string $serviceProviderName = null,
        ?string $serviceProviderPosition = null
    )
    {
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
                'department_name'           => $deptName,
                'transaction_date'          => $validated['transaction_date'],
                'harassment_details'        => $harassmentDetails,
                'service_provider'          => $serviceProviderName,
                'service_provider_position' => $serviceProviderPosition,
            ];
            
            try {
                Mail::to($recipients)->send(new HarassmentAlertMail($emailData));
            } catch (\Exception $e) {
                // Log error but don't crash the form submission for the user!
                Log::error('Harassment Alert Email Failed: ' . $e->getMessage());
            }
        }
    }
}