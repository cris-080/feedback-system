<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(): Response|RedirectResponse
    {
        if (Auth::check()) {
            $role = strtolower(trim(Auth::user()->role ?? ''));

            return $role === 'superadmin'
                ? redirect()->route('superadmin.dashboard')
                : redirect()->route('focalperson.dashboard');
        }

        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }
    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): SymfonyResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        $role = $request->user()->role;

        // Route SuperAdmins and Focal Persons to the unified RBAC command center.
        // Feedback Committee goes to their specific requests view.
       $fallbackUrl = match ($role) {
            'SuperAdmin'         => '/superAdmin/dashboard',
            'Feedback Committee' => '/feedback-committee/requests',
            default              => '/focalPerson/dashboard', // Focal Person Default
        };

        $targetUrl = session()->pull('url.intended', $fallbackUrl);

        // Using Inertia::location forces a full page reload to clear Ziggy route cache
        return Inertia::location($targetUrl);
    }
    
    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect('/login');
    }
}