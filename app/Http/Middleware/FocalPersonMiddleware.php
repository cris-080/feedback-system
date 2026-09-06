<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class FocalPersonMiddleware
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::check()) {
            $role = strtolower(trim(Auth::user()->role ?? ''));

            // Kick SuperAdmins back to their own dashboard
            if ($role === 'superadmin') {
                return redirect()->route('superadmin.dashboard');
            }

            // Kick Feedback Committee members to their own dashboard (if applicable)
            if ($role === 'feedback committee' || $role === 'feedbackcommittee') {
                return redirect()->route('feedback_committee.requests.index');
            }
        }

        // If they pass the checks (meaning they are a Focal Person), let them proceed
        return $next($request);
    }
}