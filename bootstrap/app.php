<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Support\Facades\Auth;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        
        // RESTORED: Ensure HandleInertiaRequests is back in the web group
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
            \App\Http\Middleware\PreventBackHistory::class,
        ]);

        $middleware->redirectUsersTo(function () {
            $user = Auth::user();
            if (!$user) {
                return route('login');
            }

            $role = strtolower(trim($user->role ?? ''));

            return $role === 'superadmin' 
                ? route('superadmin.dashboard') 
                : route('focalperson.dashboard');
        });

    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();