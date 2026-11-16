<?php
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Crypt;
use App\Http\Controllers\FeedbackCommittee\FeedbackCommitteeRequestController;
use App\Http\Controllers\SuperAdmin\FormController;
use App\Http\Controllers\FeedbackCommittee\ReportController;
use App\Http\Controllers\FeedbackCommittee\ArchiveController;

Route::prefix('feedback-committee')->name('feedback_committee.')->group(function () {
    
    // Report Repository
    Route::get('/reports', [ReportController::class, 'index'])->name('reports.index');
    Route::post('/reports/generate', [ReportController::class, 'generate'])->name('reports.generate');
    Route::patch('/reports/{id}/approve', [ReportController::class, 'approve'])->name('reports.approve');
    Route::patch('/reports/{id}/return', [ReportController::class, 'returnToSender'])->name('reports.return');
    Route::get('/reports/{id}/pdf', [ReportController::class, 'downloadPdf'])->name('reports.download.pdf');
    Route::delete('/reports/{id}', [ReportController::class, 'destroy'])->name('reports.destroy');
    
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

    // Archive System
    Route::get('/archives', [ArchiveController::class, 'index'])->name('archives.index');
    Route::put('/archives/reports/{id}/restore', [ArchiveController::class, 'restore'])->name('archives.reports.restore');
    Route::delete('/archives/reports/{id}/force-delete', [ArchiveController::class, 'forceDelete'])->name('archives.reports.force-delete');

    // Audit Logs
    Route::get('/audit-logs', [App\Http\Controllers\FeedbackCommittee\AuditLogController::class, 'index'])->name('audit-logs.index');
});