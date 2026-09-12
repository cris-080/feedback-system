<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Public form submissions limiter
        RateLimiter::for('form-submissions', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });

        // 1. Account Creation: 30 per hour per Admin
        RateLimiter::for('account-creation', function (Request $request) {
            return Limit::perHour(30)->by($request->user()?->id ?: $request->ip());
        });

        // 2. General Admin CRUD: 60 per minute per Admin
        RateLimiter::for('admin-crud', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });

        // 3. Internal Ticket Requests: 10 per hour per user
        RateLimiter::for('committee-requests', function (Request $request) {
            return Limit::perHour(10)->by($request->user()?->id ?: $request->ip());
        });
    }
}