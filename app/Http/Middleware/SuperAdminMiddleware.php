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

        // 1. SuperAdmin gets unrestricted access to everything
        if ($role === 'superadmin') {
            return $next($request);
        }

        // 2. Feedback Committee gets strictly limited access
        if ($role === 'feedback committee' || $role === 'feedbackcommittee') {
            
            // Allow all GET (View) requests
            if (in_array($request->method(), ['GET', 'HEAD'])) {
                return $next($request);
            }

            // Allow them to update Admin Requests (since that's their job)
            if ($request->is('superAdmin/requests*')) {
                return $next($request);
            }

            // Block everything else (Adding/Editing/Deleting Departments, Forms, Services, Positions)
            abort(403, 'Feedback Committee has View-Only access. You cannot modify departments or forms.');
        }

        // 3. Kick out Focal Persons or unauthorized users
        abort(403, 'Unauthorized Access.');
    }
}