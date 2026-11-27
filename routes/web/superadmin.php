<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SuperAdmin\DashboardController;
use App\Http\Controllers\SuperAdmin\ReportController;
use App\Http\Controllers\SuperAdmin\FeedbackController;
use App\Http\Controllers\SuperAdmin\RoleController;
use App\Http\Controllers\SuperAdmin\DepartmentController;
use App\Http\Controllers\SuperAdmin\FormController;
use App\Http\Controllers\SuperAdmin\FormBuilderController;
use App\Http\Controllers\SuperAdmin\ArchiveController;
use App\Http\Controllers\SuperAdmin\AccountController;
use App\Http\Controllers\SuperAdmin\AuditLogController;
use Illuminate\Support\Facades\Crypt;

Route::prefix('superadmin')->name('superadmin.')->group(function () {
    // Dashboards & Feedback
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    
   // Reports
    Route::get('/reports', [ReportController::class, 'index'])->name('reports.index');
    Route::post('/reports/generate', [ReportController::class, 'generate'])->name('reports.generate');
    Route::get('/reports/{id}', [ReportController::class, 'show'])->name('reports.show');
    Route::patch('/reports/{id}/approve', [ReportController::class, 'approve'])->name('reports.approve');
    Route::patch('/reports/{id}/return', [ReportController::class, 'returnToSender'])->name('reports.return');
    Route::delete('/reports/{id}', [ReportController::class, 'destroy'])->name('reports.destroy');
    Route::get('/reports/{id}/docx', [ReportController::class, 'downloadDocx'])->name('reports.docx');
    Route::get('/reports/{id}/pdf', [ReportController::class, 'downloadPdf'])->name('reports.pdf');

    // Feedbacks & SuperAdmin Harassment Notification Clearing
    Route::get('/feedbacks', [FeedbackController::class, 'index'])->name('feedbacks.index');
    Route::delete('/feedbacks/{id}', [FeedbackController::class, 'archive'])->name('feedbacks.archive');
    Route::delete('/notifications/{id}', [FeedbackController::class, 'clearNotification'])->name('notifications.clear');
    
    // Role Management
    Route::get('/roles', [RoleController::class, 'index'])->name('roles.index');
    Route::post('/roles', [RoleController::class, 'store'])->name('roles.store');
    Route::put('/roles/{id}', [RoleController::class, 'update'])->name('roles.update');
    Route::delete('/roles/{id}', [RoleController::class, 'destroy'])->name('roles.destroy');

    // Department Management
    Route::get('/departments', [DepartmentController::class, 'index'])->name('departments.index');
    Route::post('/departments', [DepartmentController::class, 'store'])->middleware('throttle:admin-crud')->name('departments.store');
    Route::put('/departments/{id}', [DepartmentController::class, 'update'])->middleware('throttle:admin-crud')->name('departments.update');
    Route::delete('/departments/{department}', [DepartmentController::class, 'destroy'])->middleware('throttle:admin-crud')->name('departments.destroy');

    // Service Providers
    Route::post('/departments/{department}/providers', [DepartmentController::class, 'storeProvider'])->name('departments.providers.store');
    Route::delete('/departments/providers/{provider}', [DepartmentController::class, 'destroyProvider'])->name('departments.providers.destroy');

    // Position Management
    Route::post('/departments/positions/bulk', [DepartmentController::class, 'bulkStorePosition'])->name('departments.positions.bulk');
    Route::post('/departments/{department}/positions', [DepartmentController::class, 'storePosition'])->name('departments.positions.store');
    Route::delete('/positions/{position}', [DepartmentController::class, 'destroyPosition'])->name('departments.positions.destroy');
    Route::get('/api/departments/{department}/positions', [DepartmentController::class, 'getPositionsByDepartment'])->name('api.departments.positions');
    
    // Services Management
    Route::post('/departments/{department}/services', [DepartmentController::class, 'addService'])->name('departments.services.store');
    Route::delete('/services/{service}', [DepartmentController::class, 'removeService'])->name('departments.services.destroy');

    // User Management
    Route::get('/users', [AccountController::class, 'index'])->name('users.index');
    Route::post('/users', [AccountController::class, 'store'])->middleware('throttle:account-creation')->name('users.store');
    Route::put('/users/{id}', [AccountController::class, 'update'])->middleware('throttle:admin-crud')->name('users.update');
    Route::delete('/users/{id}', [AccountController::class, 'destroy'])->middleware('throttle:admin-crud')->name('users.destroy');
    Route::patch('/users/{id}/suspend', [AccountController::class, 'suspend'])->name('users.suspend');
    Route::post('/users/{id}/reset-password', [AccountController::class, 'resetPassword'])->name('users.reset-password');

    // Form Management
    Route::get('/forms', [FormController::class, 'index'])->name('forms.index');
    Route::get('/form-builder', [FormBuilderController::class, 'create'])->name('forms.builder');
    Route::post('/form-builder', [FormBuilderController::class, 'store'])->middleware('throttle:form-submissions')->name('forms.store');
    Route::get('/forms/{id}/edit', [FormBuilderController::class, 'edit'])->name('forms.edit');
    Route::post('/forms/{id}/edit', [FormBuilderController::class, 'update'])->middleware('throttle:form-submissions')->name('forms.update');
    Route::delete('/forms/{id}', [FormController::class, 'destroy'])->name('forms.destroy');
    Route::put('/forms/{form}/archive', [FormController::class, 'archive'])->name('forms.archive');
    Route::put('/forms/{form}/publish', [FormController::class, 'publish'])->name('forms.publish');
    Route::get('/forms/{id}/preview', function ($id) {
        return redirect("/feedback?kiosk=true&token=" . Crypt::encryptString($id));
    })->name('forms.preview');

    // Audit Logs
    Route::get('/audit-logs', [AuditLogController::class, 'index'])->name('audit-logs.index');
    Route::delete('/audit-logs/clear', [AuditLogController::class, 'clear'])->name('audit-logs.clear');

    // Central Archives System
    Route::get('/archives', [ArchiveController::class, 'index'])->name('archives.index');
    Route::get('/archives-forms', [FormController::class, 'archives'])->name('forms.archives');
    
    // Archive Restorations & Force Deletions
    Route::put('/forms/{id}/restore', [FormController::class, 'restore'])->name('forms.restore');
    Route::delete('/forms/{id}/soft-delete', [FormController::class, 'softDelete'])->name('forms.soft-delete');
    Route::delete('/forms/{id}/force-delete', [FormController::class, 'forceDelete'])->name('forms.force-delete');
    Route::put('/departments/{id}/restore', [DepartmentController::class, 'restore'])->name('departments.restore');
    Route::delete('/departments/{id}/force-delete', [DepartmentController::class, 'forceDelete'])->name('departments.force-delete');
    Route::put('/users/{id}/restore', [AccountController::class, 'restore'])->name('users.restore');
    Route::delete('/users/{id}/force-delete', [AccountController::class, 'forceDelete'])->name('users.force-delete');
    Route::put('/reports/{id}/restore', [ReportController::class, 'restore'])->name('reports.restore');
    Route::delete('/reports/{id}/force-delete', [ReportController::class, 'forceDelete'])->name('reports.force-delete');
    Route::put('/feedbacks/{id}/restore', [FeedbackController::class, 'restore'])->name('feedbacks.restore');
});