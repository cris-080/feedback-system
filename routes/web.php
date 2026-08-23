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
use App\Http\Controllers\SuperAdmin\QrCodeController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth; // NEW: Imported Auth facade for role checking
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
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

/*
|--------------------------------------------------------------------------
| Standard Authenticated Routes (Breeze Defaults)
|--------------------------------------------------------------------------
*/
// NEW: Intercept SuperAdmin and route them correctly
Route::get('/dashboard', function () {
    $user = Auth::user();

    if ($user->role === 'SuperAdmin') {
        return redirect()->route('superadmin.dashboard'); 
    }

    // You can add more checks here later for Feedback Committee or Focal Persons
    // if they get their own custom dashboards!

    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

/*
|--------------------------------------------------------------------------
| SuperAdmin Routes
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', SuperAdminMiddleware::class])->prefix('superAdmin')->name('superadmin.')->group(function () {

    // Superadmin Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

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
    Route::post('/departments', [DepartmentController::class, 'store'])->name('departments.store');
    Route::delete('/departments/{department}', [DepartmentController::class, 'destroy'])->name('departments.destroy');
    Route::put('/departments/{id}', [DepartmentController::class, 'update'])->name('departments.update');
    // Services Management
    Route::post('/departments/{department}/services', [DepartmentController::class, 'addService'])->name('departments.services.store');
    Route::delete('/services/{service}', [DepartmentController::class, 'removeService'])->name('departments.services.destroy');

   // Archive Management
    Route::get('/archives', [FormController::class, 'archives'])->name('forms.archives');
    Route::put('/forms/{id}/restore', [FormController::class, 'restore'])->name('forms.restore');
    
    // THIS MUST BE A DELETE ROUTE TO MATCH YOUR REACT COMPONENT
    Route::delete('/forms/{id}/soft-delete', [FormController::class, 'softDelete'])->name('forms.soft-delete');

    // User Management Routes
    Route::get('/users', [UserController::class, 'index'])->name('users.index');
    Route::post('/users', [UserController::class, 'store'])->name('users.store');
    Route::delete('/users/{id}', [UserController::class, 'destroy'])->name('users.destroy');
    Route::put('/users/{id}', [UserController::class, 'update'])->name('users.update');

    // Form Deletion
    Route::delete('/forms/{id}', [FormController::class, 'destroy'])->name('forms.destroy');

    Route::get('/forms/{id}/edit', [FormBuilderController::class, 'edit'])->name('forms.edit');
    Route::post('/forms/{id}/edit', [FormBuilderController::class, 'update'])->middleware('throttle:form-submissions')->name('forms.update');
    
    // Form Builder (Creating Forms)
    Route::get('/form-builder', [FormBuilderController::class, 'create'])->name('forms.builder');
    // Applied Rate Limiter Here
    Route::post('/form-builder', [FormBuilderController::class, 'store'])->middleware('throttle:form-submissions')->name('forms.store');
    
    //Mailing the Focal Person for a Department
    Route::post('/departments/{department}/email-link', [DepartmentController::class, 'emailFocalPerson'])->name('departments.email-link');
    
    // Form Management (Displaying, Archiving, Publishing)
    Route::get('/forms', [FormController::class, 'index'])->name('forms.index');
    Route::put('/forms/{form}/archive', [FormController::class, 'archive'])->name('forms.archive');
    Route::put('/forms/{form}/publish', [FormController::class, 'publish'])->name('forms.publish');
    Route::post('/forms/{form}/clone', [FormController::class, 'clone'])->name('forms.clone');

    // Route to generate and store a new QR code
    Route::post('/qrcodes/generate', [QrCodeController::class, 'store'])->name('qrcodes.store');

    // // Add this line to load the page
    // Route::get('/qrcodes', [QrCodeController::class, 'index'])->name('qrcodes.index');
    
    // This is the one we made earlier to handle the form submission

});


/*
|--------------------------------------------------------------------------
| Feedback Committee Routes
|--------------------------------------------------------------------------
*/
// NEW: Route group for the Feedback Committee requests
Route::middleware(['auth'])->prefix('feedback-committee')->name('feedback_committee.')->group(function () {
    
    // These evaluate to /feedback-committee/requests and name('feedback_committee.requests.index'/'store')
    Route::get('/requests', [FeedbackCommitteeRequestController::class, 'index'])->name('requests.index');
    Route::post('/requests', [FeedbackCommitteeRequestController::class, 'store'])->name('requests.store');

});
// Temporary Route to Preview Email Design
Route::get('/preview-email', function () {
    // We pass fake data just to see how the template looks
    return new \App\Mail\FormLinkMail('http://localhost:8000/feedback?dept=1', 'Registrar Office');
});

require __DIR__.'/auth.php';