<?php

namespace App\Http\Controllers\FocalPerson;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\AuditLog;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $filters = $request->only(['search', 'role', 'module', 'date_from', 'date_to']);
        
        // Strict scope: Only logs triggered by users in this Focal Person's department
        // withTrashed() ensures SuperAdmin clearing logs doesn't delete them for the FP!
        $query = AuditLog::withTrashed()
            ->with('account:user_id,firstname,lastname,role,email')
            ->whereHas('account', function($q) use ($user) {
                $q->where('department_id', $user->department_id);
            });

        // Delegate query filtering to the Fat Model scope
        $logs = $query->filter($filters)
            ->orderBy('created_at', 'desc')
            ->paginate(15)
            ->withQueryString();

        // Get unique modules scoped to this department for the dropdown
        $modules = AuditLog::withTrashed()
            ->whereHas('account', function($q) use ($user) {
                $q->where('department_id', $user->department_id);
            })
            ->select('module')
            ->distinct()
            ->orderBy('module')
            ->pluck('module');

       return Inertia::render('FocalPerson/AuditLogs', [
            'logs'    => $logs,
            'modules' => $modules,
            'filters' => $filters
        ]);
    }
}