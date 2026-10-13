<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PublicFeedbackController;
use App\Http\Controllers\SuperAdmin\AccountController;
use Illuminate\Support\Facades\Auth;

// Public Feedback Portal
Route::get('/feedback', [PublicFeedbackController::class, 'show'])->name('feedback.show');
Route::post('/feedback', [PublicFeedbackController::class, 'store'])->middleware('throttle:form-submissions')->name('feedback.store');

// Welcome Page / Auto-Redirect
Route::get('/', function () {
    if (Auth::check()) {
        $role = strtolower(trim(Auth::user()->role ?? ''));
        if (in_array($role, ['superadmin', 'feedback committee', 'feedbackcommittee'])) {
            return redirect()->route('superadmin.dashboard');
        }
        return redirect()->route('focalperson.dashboard');
    }
    return redirect()->route('login');
});

// Secure Account Setup Links (From Email)
Route::get('/account/setup/{id}', [AccountController::class, 'setupPassword'])->name('account.setup');
Route::post('/account/setup/{id}', [AccountController::class, 'savePassword'])->name('account.setup.save');