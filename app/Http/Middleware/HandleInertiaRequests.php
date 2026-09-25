<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;
use App\Models\AdminRequest;
use App\Models\Feedback;
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
            // ADDED: This bridges Laravel session messages to React props for SweetAlert
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error'   => fn () => $request->session()->get('error'),
            ],
           'pendingRequestsCount' => function () use ($request) {
                if (!$request->user()) return 0;
                $role = strtolower(trim($request->user()->role ?? ''));
                $userId = $request->user()->user_id;
                $count = 0;

                if ($role === 'superadmin') {
                    $count += AdminRequest::where('status', 'Pending')->where('is_notified_superadmin', false)->count();
                    $count += Feedback::join('feedback_answers', 'feedback.response_id', '=', 'feedback_answers.response_id')
                        ->join('form_fields', 'feedback_answers.field_id', '=', 'form_fields.field_id')
                        ->where('form_fields.field_label', 'LIKE', '%harassment%')->where('feedback_answers.answer_text', 'Yes')
                        ->where('feedback.is_notified_superadmin', false)->count();
                } elseif (str_contains($role, 'feedback') || str_contains($role, 'focal')) {
                    $count += AdminRequest::whereIn('status', ['Approved', 'Rejected'])->where('is_notified_committee', false)->where('admin_id', $userId)->count();
                    $count += Feedback::join('feedback_answers', 'feedback.response_id', '=', 'feedback_answers.response_id')
                        ->join('form_fields', 'feedback_answers.field_id', '=', 'form_fields.field_id')
                        ->where('form_fields.field_label', 'LIKE', '%harassment%')->where('feedback_answers.answer_text', 'Yes')
                        ->where('feedback.is_notified_committee', false)->count();
                }
                return $count;
            },

            'recentNotifications' => function () use ($request) {
                if (!$request->user()) return [];
                $role = strtolower(trim($request->user()->role ?? ''));
                $userId = $request->user()->user_id;
                $notifications = collect();

                if ($role === 'superadmin') {
                    $adminReqs = AdminRequest::where('status', 'Pending')->where('is_notified_superadmin', false)->orderBy('created_at', 'desc')->take(5)->get();
                    $harassments = \App\Models\Feedback::join('feedback_answers', 'feedback.response_id', '=', 'feedback_answers.response_id')
                        ->join('form_fields', 'feedback_answers.field_id', '=', 'form_fields.field_id')
                        ->where('form_fields.field_label', 'LIKE', '%harassment%')->where('feedback_answers.answer_text', 'Yes')
                        ->where('feedback.is_notified_superadmin', false)
                        ->select('feedback.response_id', 'feedback.submitted_at', 'feedback.control_number')
                        ->orderBy('feedback.submitted_at', 'desc')->take(5)->get();
                } elseif (str_contains($role, 'feedback') || str_contains($role, 'focal')) {
                    $adminReqs = AdminRequest::whereIn('status', ['Approved', 'Rejected'])->where('is_notified_committee', false)->where('admin_id', $userId)->orderBy('created_at', 'desc')->take(5)->get();
                    $harassments = Feedback::join('feedback_answers', 'feedback.response_id', '=', 'feedback_answers.response_id')
                        ->join('form_fields', 'feedback_answers.field_id', '=', 'form_fields.field_id')
                        ->where('form_fields.field_label', 'LIKE', '%harassment%')->where('feedback_answers.answer_text', 'Yes')
                        ->where('feedback.is_notified_committee', false)
                        ->select('feedback.response_id', 'feedback.submitted_at', 'feedback.control_number')
                        ->orderBy('feedback.submitted_at', 'desc')->take(5)->get();
                } else {
                    return [];
                }

                foreach ($adminReqs as $req) {
                    $notifications->push([
                        'request_id' => $req->request_id,
                        'status' => $req->status,
                        'request_type' => $req->request_type,
                        'remarks' => $req->remarks,
                        'created_at' => $req->created_at,
                        'is_harassment' => false
                    ]);
                }

                foreach ($harassments as $h) {
                    $notifications->push([
                        'request_id' => 'harassment_' . $h->response_id, // Trojan horse prefix for routing!
                        'status' => 'Urgent',
                        'request_type' => 'Harassment Report',
                        'remarks' => 'A respondent flagged a harassment issue. Control #: ' . $h->control_number,
                        'created_at' => $h->submitted_at,
                        'is_harassment' => true
                    ]);
                }

                return $notifications->sortByDesc('created_at')->take(5)->values()->all();
            },
        ];
    }
}