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
        if (Auth::check()) {
            $role = strtolower(trim(Auth::user()->role ?? ''));

            // If they are a SuperAdmin, let them pass
            if ($role === 'superadmin') {
                return $next($request);
            }

            // If a Focal Person hits a SuperAdmin URL via the back button, bounce them back safely
            return redirect()->route('focalperson.dashboard');
        }

        return redirect()->route('login');
    }
}