<?php
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Crypt;
use App\Http\Controllers\FeedbackCommittee\FeedbackCommitteeRequestController;
use App\Http\Controllers\SuperAdmin\FormController;

Route::prefix('feedback-committee')->name('feedback_committee.')->group(function () {
    Route::get('/reports', function () { return inertia('FeedbackCommittee/Reports'); })->name('reports.index');
    
    // Forms & Preview
    Route::get('/forms', [FormController::class, 'index'])->name('forms.index');
    Route::get('/forms/{id}/preview', function ($id) {
        return redirect("/feedback?kiosk=true&token=" . Crypt::encryptString($id));
    })->name('forms.preview');

    // Requests Management
    Route::get('/requests', [FeedbackCommitteeRequestController::class, 'index'])->name('requests.index');
    Route::post('/requests', [FeedbackCommitteeRequestController::class, 'store'])->middleware('throttle:committee-requests')->name('requests.store');
    Route::patch('/requests/{id}/status', [FeedbackCommitteeRequestController::class, 'updateStatus'])->name('requests.update');
    Route::delete('/requests/{id}', [FeedbackCommitteeRequestController::class, 'destroy'])->name('requests.destroy');
});