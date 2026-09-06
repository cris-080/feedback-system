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
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user() ? [
                    // CHANGE: Use user_id to match your Account model's primary key
                    'id' => $request->user()->user_id,
                    'firstname' => $request->user()->firstname,
                    'lastname' => $request->user()->lastname,
                    'email' => $request->user()->email,
                    'role' => $request->user()->role,
                    'department_id' => $request->user()->department_id,
                ] : null,
            ],
        ];
    }
}
