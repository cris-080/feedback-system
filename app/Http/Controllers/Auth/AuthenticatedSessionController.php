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

            if ($role === 'superadmin' || $role === 'feedback committee' || $role === 'feedbackcommittee') {
                return redirect()->route('superadmin.dashboard');
            }

            return redirect()->route('focalperson.dashboard');
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

        $role = strtolower(trim($request->user()->role ?? ''));

        // Route SuperAdmins and Feedback Committee to the unified RBAC command center.
       $fallbackUrl = match ($role) {
            'superadmin'         => '/superAdmin/dashboard',
            'feedback committee' => '/superAdmin/dashboard',
            'feedbackcommittee'  => '/superAdmin/dashboard',
            default              => '/focalPerson/dashboard', // Focal Person Default
        };

        $targetUrl = session()->pull('url.intended', $fallbackUrl);

        // Using Inertia::location forces a full page reload to clear Ziggy route cache
        return Inertia::location($targetUrl);
    }
    
    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): SymfonyResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        // Inertia::location forces a hard browser reload, wiping the SPA memory cache
        return Inertia::location('/login');
    }
}