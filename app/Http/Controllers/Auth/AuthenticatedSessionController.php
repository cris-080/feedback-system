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
    public function create(): Response
    {
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

        // 1. Get the authenticated user's role
        $role = $request->user()->role;

        // 2. Determine their default dashboard based on their specific role
        $fallbackUrl = match ($role) {
            'SuperAdmin'         => '/superAdmin/dashboard',
            'Feedback Committee' => '/admin/dashboard',
            default              => '/dashboard',
        };

        // 3. Get the intended URL (if they clicked a link before logging in), or use the fallback
        $targetUrl = session()->pull('url.intended', $fallbackUrl);

        // 4. Use Inertia::location to force a full page reload and fix Ziggy route caching
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