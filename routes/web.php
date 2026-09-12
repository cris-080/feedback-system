<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SuperAdmin\FormBuilderController;
use App\Http\Controllers\SuperAdmin\FormController;
use App\Http\Controllers\SuperAdmin\UserController;
use App\Http\Controllers\SuperAdmin\DashboardController;
use App\Http\Controllers\SuperAdmin\DepartmentController;
use App\Http\Controllers\SuperAdmin\AdminRequestController;
use App\Http\Middleware\SuperAdminMiddleware;
use App\Http\Controllers\FeedbackCommittee\FeedbackCommitteeRequestController;
use App\Http\Controllers\PublicFeedbackController;
use App\Http\Controllers\SuperAdmin\RoleController;
use App\Http\Controllers\SuperAdmin\ArchiveController;
use App\Http\Middleware\FocalPersonMiddleware;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\FocalPerson\FocalDepartmentController;
use App\Http\Controllers\SuperAdmin\FeedbackController;
use Illuminate\Support\Facades\Auth; 
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/

// Public Feedback Portal
Route::get('/feedback', [PublicFeedbackController::class, 'show'])->name('feedback.show');
// Applied Rate Limiter Here
Route::post('/feedback', [PublicFeedbackController::class, 'store'])->middleware('throttle:form-submissions')->name('feedback.store');

// Welcome Page
Route::get('/', function () {
    if (Auth::check()) {
        $role = strtolower(trim(Auth::user()->role ?? ''));
        
        // Both SuperAdmin and Feedback Committee share the main dashboard
        if ($role === 'superadmin' || $role === 'feedback committee' || $role === 'feedbackcommittee') {
            return redirect()->route('superadmin.dashboard');
        }

        return redirect()->route('focalperson.dashboard');
    }

    return redirect()->route('login');
});

/*
|--------------------------------------------------------------------------
| Standard Authenticated Routes
|--------------------------------------------------------------------------
*/
Route::middleware('auth')->group(function () {
    
    Route::get('/dashboard', function () {
        $role = strtolower(trim(Auth::user()->role ?? ''));
        
        if ($role === 'superadmin' || $role === 'feedback committee' || $role === 'feedbackcommittee') {
            return redirect()->route('superadmin.dashboard');
        }
        
        return redirect()->route('focalperson.dashboard');
    })->name('dashboard');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

/*
|--------------------------------------------------------------------------
| Focal Person Routes
|--------------------------------------------------------------------------
*/
// Dedicated URL structure for Focal Persons
Route::middleware(['auth', FocalPersonMiddleware::class])->prefix('focalPerson')->name('focalperson.')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    
    // Reports Route
    Route::get('/reports', function () {
        return inertia('FocalPerson/Reports');
    })->name('reports.index');
    
    Route::get('/feedbacks', [FeedbackController::class, 'index'])->name('feedbacks.index');
    Route::get('/forms', [FormController::class, 'focalPersonIndex'])->name('forms.index');
    
    // My Department Config
    Route::get('/department', [FocalDepartmentController::class, 'index'])->name('department.index');
    
    // Services
    Route::post('/department/services', [FocalDepartmentController::class, 'storeService'])->name('department.services.store');
    Route::delete('/department/services/{id}', [FocalDepartmentController::class, 'destroyService'])->name('department.services.destroy');
    
    // Positions
    Route::post('/department/positions', [FocalDepartmentController::class, 'storePosition'])->name('department.positions.store');
    Route::delete('/department/positions/{id}', [FocalDepartmentController::class, 'destroyPosition'])->name('department.positions.destroy');
    
    // Providers
    Route::post('/department/providers', [FocalDepartmentController::class, 'storeProvider'])->name('department.providers.store');
    Route::delete('/department/providers/{id}', [FocalDepartmentController::class, 'destroyProvider'])->name('department.providers.destroy');
});

/*
|--------------------------------------------------------------------------
| Strict SuperAdmin Routes
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', SuperAdminMiddleware::class])->prefix('superAdmin')->name('superadmin.')->group(function () {

    // Dashboards & Feedback
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    
    // NEW: Placeholder route for SuperAdmin Reports to prevent Ziggy crash
    Route::get('/reports', function () {
        return inertia('SuperAdmin/Reports');
    })->name('reports.index');

    Route::get('/feedbacks', [FeedbackController::class, 'index'])->name('feedbacks.index');

    // Admin Requests Management
    Route::get('/requests', [AdminRequestController::class, 'index'])->name('requests.index');
    Route::patch('/requests/{id}/status', [AdminRequestController::class, 'updateStatus'])->name('requests.update');
    
    // Role Management Routes
    Route::get('/roles', [RoleController::class, 'index'])->name('roles.index');
    Route::post('/roles', [RoleController::class, 'store'])->name('roles.store');
    Route::put('/roles/{id}', [RoleController::class, 'update'])->name('roles.update');
    Route::delete('/roles/{id}', [RoleController::class, 'destroy'])->name('roles.destroy');

    // Department Management
    Route::get('/departments', [DepartmentController::class, 'index'])->name('departments.index');
    Route::post('/departments', [DepartmentController::class, 'store'])->middleware('throttle:admin-crud')->name('departments.store');
    Route::delete('/departments/{department}', [DepartmentController::class, 'destroy'])->middleware('throttle:admin-crud')->name('departments.destroy');
    Route::put('/departments/{id}', [DepartmentController::class, 'update'])->middleware('throttle:admin-crud')->name('departments.update');

    // Service Providers
    Route::post('/departments/{department}/providers', [DepartmentController::class, 'storeProvider'])
        ->name('departments.providers.store');

    Route::delete('/departments/providers/{provider}', [DepartmentController::class, 'destroyProvider'])
        ->name('departments.providers.destroy');

    //Position Management
    Route::post('/departments/positions/bulk', [DepartmentController::class, 'bulkStorePosition'])->name('departments.positions.bulk');
    Route::get('/api/departments/{department}/positions', [DepartmentController::class, 'getPositionsByDepartment'])
    ->name('api.departments.positions');
    
    // Services Management
    Route::post('/departments/{department}/services', [DepartmentController::class, 'addService'])->name('departments.services.store');
    Route::delete('/services/{service}', [DepartmentController::class, 'removeService'])->name('departments.services.destroy');

    // Archive Management
    Route::get('/archives-forms', [FormController::class, 'archives'])->name('forms.archives');
    Route::put('/forms/{id}/restore', [FormController::class, 'restore'])->name('forms.restore');
    Route::delete('/forms/{id}/soft-delete', [FormController::class, 'softDelete'])->name('forms.soft-delete');

    // User Management Routes
    Route::get('/users', [UserController::class, 'index'])->name('users.index');
    Route::post('/users', [UserController::class, 'store'])->middleware('throttle:account-creation')->name('users.store');
    Route::delete('/users/{id}', [UserController::class, 'destroy'])->middleware('throttle:admin-crud')->name('users.destroy');
    Route::put('/users/{id}', [UserController::class, 'update'])->middleware('throttle:admin-crud')->name('users.update');

    // Form Builder & Deletion
    Route::delete('/forms/{id}', [FormController::class, 'destroy'])->name('forms.destroy');
    Route::get('/forms/{id}/edit', [FormBuilderController::class, 'edit'])->name('forms.edit');
    Route::post('/forms/{id}/edit', [FormBuilderController::class, 'update'])->middleware('throttle:form-submissions')->name('forms.update');
    Route::get('/form-builder', [FormBuilderController::class, 'create'])->name('forms.builder');
    Route::post('/form-builder', [FormBuilderController::class, 'store'])->middleware('throttle:form-submissions')->name('forms.store');
    Route::get('/forms', [FormController::class, 'index'])->name('forms.index');
    
    // Form Management Actions
    Route::get('/forms/{id}/preview', function ($id) {
        $token = Crypt::encryptString($id);
        return redirect("/feedback?kiosk=true&token={$token}");
    })->name('forms.preview');
    Route::put('/forms/{form}/archive', [FormController::class, 'archive'])->name('forms.archive');
    Route::put('/forms/{form}/publish', [FormController::class, 'publish'])->name('forms.publish');
    Route::post('/forms/{form}/clone', [FormController::class, 'clone'])->name('forms.clone');

    // Central Archives System
    Route::get('/archives', [ArchiveController::class, 'index'])->name('archives.index');
    Route::put('/departments/{id}/restore', [DepartmentController::class, 'restore'])->name('departments.restore');
    Route::delete('/departments/{id}/force-delete', [DepartmentController::class, 'forceDelete'])->name('departments.force-delete');
    Route::delete('/forms/{id}/force-delete', [FormController::class, 'forceDelete'])->name('forms.force-delete');

    Route::post('/departments/{department}/positions', [DepartmentController::class, 'storePosition'])->name('departments.positions.store');
    Route::delete('/positions/{position}', [DepartmentController::class, 'destroyPosition'])->name('departments.positions.destroy');
    Route::get('/api/departments/{department}/positions', [DepartmentController::class, 'getPositionsByDepartment'])->name('api.departments.positions');
    

});

/*
|--------------------------------------------------------------------------
| Feedback Committee Routes
|--------------------------------------------------------------------------
*/
Route::middleware(['auth'])->prefix('feedback-committee')->name('feedback_committee.')->group(function () {
    Route::get('/requests', [FeedbackCommitteeRequestController::class, 'index'])->name('requests.index');
    Route::get('/reports', function () { return inertia('FeedbackCommittee/Reports'); })->name('reports.index');
    Route::post('/requests', [FeedbackCommitteeRequestController::class, 'store']) ->middleware('throttle:committee-requests')  ->name('requests.store');
        
    // Delete route for cancelling a request
    Route::delete('/requests/{id}', [FeedbackCommitteeRequestController::class, 'destroy'])
        ->name('requests.destroy');
});

require __DIR__.'/auth.php';