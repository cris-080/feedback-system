<?php

namespace App\Http\Controllers\FeedbackCommittee;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\AuditLog;
use Inertia\Inertia;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->only(['search', 'module', 'date_from', 'date_to']);

        // Strict scope: Only logs triggered by Feedback Committee members, including soft-deleted ones
        $query = AuditLog::withTrashed()
            ->with('account:user_id,firstname,lastname,role,email')
            ->whereHas('account', function($q) {
                $q->where('role', 'Feedback Committee');
            });

        // Delegate query filtering to the Fat Model scope
        $logs = $query->filter($filters)
            ->orderBy('created_at', 'desc')
            ->paginate(15)
            ->withQueryString();

        $modules = AuditLog::withTrashed()
            ->whereHas('account', function($q) {
                $q->where('role', 'Feedback Committee');
            })
            ->select('module')
            ->distinct()
            ->orderBy('module')
            ->pluck('module');

       return Inertia::render('FeedbackCommittee/AuditLogs', [
            'logs'    => $logs,
            'modules' => $modules,
            'filters' => $filters
        ]);
    }
}