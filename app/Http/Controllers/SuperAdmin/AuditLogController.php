<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\AuditLog;
use Inertia\Inertia;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->only(['search', 'role', 'module', 'date_from', 'date_to']);

        $logs = AuditLog::with('account:user_id,firstname,lastname,role,email')
            ->filter($filters)
            ->orderBy('created_at', 'desc')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('SuperAdmin/AuditLogs', [
            'logs'    => $logs,
            'modules' => AuditLog::getDistinctModules(),
            'filters' => $filters
        ]);
    }

    public function clear()
    {
        AuditLog::clearAllLogs();
        return redirect()->back()->with('success', 'All system audit logs have been successfully cleared from your view.');
    }
}