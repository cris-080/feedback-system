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
use Illuminate\Support\Str;
use App\Models\QrCode;
use Illuminate\Support\Facades\Log;
use App\Models\Feedback;
use App\Services\FeedbackSubmissionService;
use Inertia\Inertia;;

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
        $isExpired = false;

        // 1. Check if token is the Kiosk's permanent encrypted Form ID
        try {
            $decrypted = Crypt::decryptString($token);
            if (is_numeric($decrypted)) {
                $formId = $decrypted;
            }
        } catch (DecryptException $e) {
            // Decryption failed, treat as scanned QR token.
        }

        // 2. Token is a Scanned QR Code
        if (!$formId) {
            $qrCode = QrCode::where('qr_token', $token)->where('is_active', 1)->first();

            if (!$qrCode) {
                abort(404, 'Access Denied: This link is invalid or has been deactivated.');
            }

            $qrId = $qrCode->qr_id;
            $activeForm = Form::where('department_id', $qrCode->department_id)->where('status', 'Active')->first();

            if (!$activeForm) {
                abort(404, 'There is no active feedback form for this department at the moment.');
            }
            $formId = $activeForm->form_id;

            // Check if the 15-minute QR link has expired
            if ($qrCode->expires_at && now()->greaterThan($qrCode->expires_at)) {
                $isExpired = true;
            }
        }

        // 3. The 2-Hour VIP Pass Check
        // If they scanned an expired code but ALREADY have a valid session cookie, let them in.
        if ($isExpired) {
            if (!$request->cookie('csm_session_' . $formId)) {
                abort(403, 'This QR code has expired. Please scan the latest QR code on the kiosk screen.');
            }
        }

        $fullForm = Form::getActiveForm($formId);

        if (!$fullForm) {
            abort(404, 'No active feedback form is currently available for this link.');
        }

        $phRegions = Cache::remember('ph_regions', 2592000, function () {
            try {
                $response = Http::timeout(5)->get('https://psgc.gitlab.io/api/regions/');
                if ($response->successful()) {
                    $data = $response->json();
                    usort($data, fn($a, $b) => strcmp($a['name'], $b['name']));
                    return $data;
                }
            } catch (\Exception $e) {
                return [['name' => 'Central Luzon', 'regionName' => 'Region III']];
            }
            return [];
        });

        $department = Department::with('service_providers')
            ->where('department_id', $fullForm->department_id)
            ->first();

        // 4. Kiosk Auto-Rotation Logic (Only runs if opened on the physical tablet)
        $isKiosk = $request->boolean('kiosk');
        $qrImageUrl = null;

        if ($isKiosk && $department) {
            $activeQrCode = QrCode::where('department_id', $fullForm->department_id)
                ->where('is_active', 1)
                ->first();

           if ($activeQrCode) {
                // If it's expired (or has no expiration), generate a fresh 15-minute token
                if (is_null($activeQrCode->expires_at) || now()->greaterThan($activeQrCode->expires_at)) {
                    $activeQrCode->qr_token = Str::random(40);
                    $activeQrCode->expires_at = now()->addMinutes(15);
                    $activeQrCode->save();
                }

                $scanUrl = url('/feedback?token=' . $activeQrCode->qr_token);
                $qrImageUrl = 'https://quickchart.io/qr?text=' . urlencode($scanUrl) . '&size=400&margin=2';
            }
        }

       // 5. Drop the 2-Hour Session Cookie for mobile scanners
        if (!$isKiosk) {
            \Illuminate\Support\Facades\Cookie::queue('csm_session_' . $formId, 'valid', 120);
        }

        // 6. Check if this specific user has ALREADY submitted feedback in this session
        $hasAlreadySubmitted = $request->cookie('csm_completed_' . $formId) ? true : false;

        return Inertia::render('Feedback/Index', [
            'already_submitted' => $hasAlreadySubmitted,
            'form'             => $fullForm,
            'departmentName'   => $department ? $department->department_name : 'General',
            'serviceProviders' => $department ? $department->service_providers : [],
            'isCC'             => $fullForm->form_type !== 'Non-CC',
            'steps'            => $fullForm->getFormattedSteps(),
            'qr_id'            => $qrId,
            'ph_regions'       => $phRegions,
            'qr_data'          => $isKiosk && $qrImageUrl ? [
                'base64' => $qrImageUrl,
            ] : null
        ]);
    }

 /**
     * Handles the feedback submission with Multi-Select Payload Splitting and Email Alerts.
     */
   public function store(Request $request)
    {
        // 1. Validate Request (PIN removed)
        $validated = $request->validate([
            'form_id'          => 'required|integer|exists:forms,form_id',
            'department_id'    => 'required|integer|exists:department,department_id',
            'email_address'    => 'required|email|max:255',
            'transaction_date' => 'required|date|before_or_equal:today',
            'answers'          => 'required|array',
            'is_kiosk'         => 'required|boolean',
        ]);

        // --- SPAM PREVENTION 2: Secure Session Cookie Check (The PIN Replacement) ---
        if (!$validated['is_kiosk']) {
            if (!$request->cookie('csm_session_' . $validated['form_id'])) {
                return back()->withErrors(['spam' => 'Your secure session has expired. Please scan the QR code at the counter again.']);
            }
        }
        
        // 2. Delegate all complex processing (Payload Splitting, AI Sentiment, Emails) to the Service
        FeedbackSubmissionService::process($validated);

        // 3. Drop a "Completed" cookie to prevent duplicate submissions on refresh
        if (!$validated['is_kiosk']) {
            // Lock out the mobile browser for 2 hours (120 mins) so they can't answer it again
            \Illuminate\Support\Facades\Cookie::queue('csm_completed_' . $validated['form_id'], 'true', 120);
        }

        // 4. Return HTTP Response
        return back()->with('success', 'Your feedback has been successfully submitted!');
    }
}