<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\ProfileController;
use App\Http\Middleware\SuperAdminMiddleware;
use App\Http\Middleware\FocalPersonMiddleware;
use Illuminate\Support\Facades\Schedule;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
| Routes are now split into modular files located in `routes/web/`
| to maintain a clean architecture.
|--------------------------------------------------------------------------
*/

// Load Public Routes
require __DIR__.'/web/public.php';

// Load Standard Authenticated Routes
Route::middleware('auth')->group(function () {
    Route::get('/dashboard', function () {
        $role = strtolower(trim(Auth::user()->role ?? ''));
        if (in_array($role, ['superadmin', 'feedback committee', 'feedbackcommittee'])) {
            return redirect()->route('superadmin.dashboard');
        }
        return redirect()->route('focalperson.dashboard');
    })->name('dashboard');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

// Load Role-Based Routes
Route::middleware(['auth', SuperAdminMiddleware::class])->group(function () {
    require __DIR__.'/web/superadmin.php';
});

Route::middleware(['auth', FocalPersonMiddleware::class])->group(function () {
    require __DIR__.'/web/focalperson.php';
});

Route::middleware(['auth'])->group(function () {
    require __DIR__.'/web/feedbackcommittee.php';
});

Schedule::command('app:rotate-daily-pins')->daily();

require __DIR__.'/auth.php';