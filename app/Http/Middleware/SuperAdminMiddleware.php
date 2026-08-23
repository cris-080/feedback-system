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
    public function handle(Request $request, Closure $next): Response
    {
        // 1. Check if the user is authenticated AND their role is exactly 'SuperAdmin'
        if (Auth::check() && Auth::user()->role === 'SuperAdmin') {
            return $next($request); // Let them pass[cite: 2]
        }

        // 2. If they are not a SuperAdmin, completely block access with a 403 Forbidden error
        abort(403, 'UNAUTHORIZED ACCESS: SuperAdmin privileges are required to view this page.');
        
        // (Optional alternative: Instead of aborting, you could redirect them back to their own dashboard)
        // return redirect('/dashboard')->with('error', 'You do not have permission to access that area.');[cite: 2]
    }
}