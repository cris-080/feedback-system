<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Contracts\Encryption\DecryptException;
use App\Models\Form;
use App\Models\Department;
use App\Models\Feedback;
use App\Services\GeminiSentimentService; // NEW: Import the AI Service
use Inertia\Inertia;

class PublicFeedbackController extends Controller
{
    /**
     * Renders the public feedback form.
     */
    public function show(Request $request)
    {
        if (!$request->has('token')) {
            abort(403, 'Access Denied: Missing secure token.');
        }

        $token = $request->token;
        $qrId = null;
        $formId = null;

        // 1. Try to decrypt the token (Checks if it came from the Email Mailer)
        try {
            $decrypted = Crypt::decryptString($token);
            if (is_numeric($decrypted)) {
                $formId = $decrypted; // It's a valid emailed Form ID!
            }
        } catch (\Illuminate\Contracts\Encryption\DecryptException $e) {
            // Decryption failed. This means it is NOT an email link.
            // It must be a raw QR Code string. We move to step 2.
        }

        // 2. If it wasn't an email token, check the QR Code database
        if (!$formId) {
            $qrCode = \App\Models\QrCode::where('qr_token', $token)
                            ->where('is_active', 1)
                            ->first();

            if (!$qrCode) {
                abort(404, 'Access Denied: This link is invalid or has been deactivated.');
            }

            $qrId = $qrCode->qr_id; // Capture the QR ID so we know which desk was scanned

            // Find the active form for this QR code's department
            $activeForm = \App\Models\Form::where('department_id', $qrCode->department_id)
                        ->where('status', 'Active')
                        ->first();

            if (!$activeForm) {
                abort(404, 'There is no active feedback form for this department at the moment.');
            }
            
            $formId = $activeForm->form_id;
        }

        // 3. Fetch the full form details using the resolved Form ID
        $fullForm = \App\Models\Form::getActiveForm($formId);

        if (!$fullForm) {
            abort(404, 'No active feedback form is currently available for this link.');
        }

        return Inertia::render('Feedback/Index', [
            'form'           => $fullForm,
            'departmentName' => \App\Models\Department::getNameOrDefault($fullForm->department_id),
            'isCC'           => $fullForm->form_type !== 'Non-CC',
            'steps'          => $fullForm->getFormattedSteps(),
            'qr_id'          => $qrId // This will be null for emailed links, but holds the ID for scans!
        ]);
    }

    /**
     * Handles the feedback submission.
     */
    public function store(Request $request)
    {
        // 1. Validate Request
        $validated = $request->validate([
            'form_id'       => 'required|integer|exists:forms,form_id',
            'department_id' => 'required|integer|exists:department,department_id',
            'email_address' => 'required|email|max:255',
            'answers'       => 'required|array',
        ]);

        // 2. Ask Gemini to analyze the entire array of student answers
        $aiAnalysis = GeminiSentimentService::analyze(json_encode($validated['answers']));

        // 3. Merge the AI insights into our validated payload
        $validated['sentiment']       = $aiAnalysis['sentiment_category'] ?? 'Uncategorized';
        $validated['ai_confidence']   = $aiAnalysis['confidence_score'] ?? 0;
        $validated['theme']           = $aiAnalysis['key_theme'] ?? 'Analysis Pending';
        $validated['english_summary'] = $aiAnalysis['translated_summary'] ?? 'AI analysis temporarily unavailable.';

        // 4. Delegate Database Transaction to the Model
        Feedback::processSubmission($validated);

        // 5. Return HTTP Response
        return back()->with('success', 'Your feedback has been successfully submitted!');
    }
}