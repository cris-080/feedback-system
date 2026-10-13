<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SuperAdmin\DashboardController;
use App\Http\Controllers\SuperAdmin\FeedbackController;
use App\Http\Controllers\SuperAdmin\FormController;
use App\Http\Controllers\FocalPerson\FocalDepartmentController;
use App\Http\Controllers\FocalPerson\RequestController;

Route::prefix('focal')->name('focalperson.')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    
    // Reports Route
    Route::get('/reports', function () { return inertia('FocalPerson/Reports'); })->name('reports.index');
    
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
});