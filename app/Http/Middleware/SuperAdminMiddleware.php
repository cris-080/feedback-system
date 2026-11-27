<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class SuperAdminMiddleware
{
    /**
     * Handle an incoming request.
     */
  
    public function handle(Request $request, Closure $next)
    {
        $role = strtolower(trim(auth()->user()->role ?? ''));

        // 1. SuperAdmin may only access /superadmin/* routes
        if ($role === 'superadmin' && $request->is('superadmin', 'superadmin/*')) {
            return $next($request);
        }

        // 2. Feedback Committee may only access /feedback-committee/* routes
        if (in_array($role, ['feedback committee', 'feedbackcommittee']) && $request->is('feedback-committee', 'feedback-committee/*')) {
            return $next($request);
        }

        // 3. Block cross-prefix URLs, Focal Persons, or unauthorized users
        abort(403, 'Unauthorized Access.');
    }
}