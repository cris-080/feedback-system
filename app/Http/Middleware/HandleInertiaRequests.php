<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        // 1. Initialize the count at 0
        $pendingRequestsCount = 0;

        // 2. Check if the user is logged in AND is a superAdmin
        if ($request->user() && $request->user()->role === 'superAdmin') {
            // Count all requests that are still 'Pending'
            $pendingRequestsCount = \Illuminate\Support\Facades\DB::table('admin_requests')
                ->where('status', 'Pending')
                ->count();
        }

        return array_merge(parent::share($request), [
            'auth' => [
                'user' => $request->user(),
            ],
            // 3. Share the count globally with React
            'pendingRequestsCount' => $pendingRequestsCount,
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
        ]);
    }
}
