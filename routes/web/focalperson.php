<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SuperAdmin\DashboardController;
use App\Http\Controllers\SuperAdmin\FeedbackController;
use App\Http\Controllers\SuperAdmin\FormController;
use App\Http\Controllers\FocalPerson\FocalDepartmentController;
use App\Http\Controllers\FocalPerson\RequestController;
use App\Http\Controllers\FocalPerson\ArchiveController;
use App\Http\Controllers\FocalPerson\ReportController;

Route::prefix('focal')->name('focalperson.')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    
    // --- REPORTS ROUTES ---
    Route::get('/reports', [ReportController::class, 'index'])->name('reports.index');
    Route::post('/reports/generate', [ReportController::class, 'generate'])->name('reports.generate');
    Route::post('/reports/{id}/submit', [ReportController::class, 'submitToCommittee'])->name('reports.submit');
    Route::delete('/reports/{id}', [ReportController::class, 'destroy'])->name('reports.destroy');
    Route::post('/reports/{id}/recall', [ReportController::class, 'recall'])->name('reports.recall');
    
    // Download Routes
    Route::get('/reports/{id}/docx', [ReportController::class, 'downloadDocx'])->name('reports.download.docx');
    Route::get('/reports/{id}/pdf', [ReportController::class, 'downloadPdf'])->name('reports.download.pdf');
    // ----------------------

    Route::get('/feedbacks', [FeedbackController::class, 'index'])->name('feedbacks.index');
    Route::get('/forms', [FormController::class, 'focalPersonIndex'])->name('forms.index');
    
    // My Department Config
    Route::get('/department', [FocalDepartmentController::class, 'index'])->name('department.index');
    Route::post('/department/services', [FocalDepartmentController::class, 'storeService'])->name('department.services.store');
    Route::delete('/department/services/{id}', [FocalDepartmentController::class, 'destroyService'])->name('department.services.destroy');
    Route::post('/department/positions', [FocalDepartmentController::class, 'storePosition'])->name('department.positions.store');
    Route::delete('/department/positions/{id}', [FocalDepartmentController::class, 'destroyPosition'])->name('department.positions.destroy');
    Route::post('/department/providers', [FocalDepartmentController::class, 'storeProvider'])->name('department.providers.store');
    Route::delete('/department/providers/{id}', [FocalDepartmentController::class, 'destroyProvider'])->name('department.providers.destroy');

    // Focal Person Requests
    Route::get('/requests', [RequestController::class, 'index'])->name('requests.index');
    Route::post('/requests', [RequestController::class, 'store'])->name('requests.store');
    Route::delete('/requests/{id}', [RequestController::class, 'destroy'])->name('requests.destroy');

    // Archive System
    Route::get('/archives', [ArchiveController::class, 'index'])->name('archives.index');
    Route::put('/archives/reports/{id}/restore', [ArchiveController::class, 'restore'])->name('archives.reports.restore');
    Route::delete('/archives/reports/{id}/force-delete', [ArchiveController::class, 'forceDelete'])->name('archives.reports.force-delete');
// Audit Logs
    Route::get('/audit-logs', [App\Http\Controllers\FocalPerson\AuditLogController::class, 'index'])->name('audit-logs.index');
});

