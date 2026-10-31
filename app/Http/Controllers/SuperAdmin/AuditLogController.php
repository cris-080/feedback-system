<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\AuditLog;
use Inertia\Inertia;
use Carbon\Carbon;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $query = AuditLog::with('account:user_id,firstname,lastname,role,email');

        // 1. Search Filter (Action, Details, or User Name)
        if ($search = $request->query('search')) {
            $like = '%' . $search . '%';
            $query->where(function($q) use ($like) {
                $q->where('action', 'LIKE', $like)
                  ->orWhere('details', 'LIKE', $like)
                  ->orWhere('module', 'LIKE', $like)
                  ->orWhereHas('account', function($accountQuery) use ($like) {
                      $accountQuery->whereRaw("CONCAT(firstname, ' ', lastname) LIKE ?", [$like])
                                   ->orWhere('email', 'LIKE', $like);
                  });
            });
        }

        // 2. Role Filter
        if ($role = $request->query('role')) {
            $query->whereHas('account', function($accountQuery) use ($role) {
                $accountQuery->where('role', $role);
            });
        }

        // 3. Module Filter
        if ($module = $request->query('module')) {
            $query->where('module', $module);
        }

        // 4. Date Range Filters
        if ($dateFrom = $request->query('date_from')) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }
        if ($dateTo = $request->query('date_to')) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        $logs = $query->orderBy('created_at', 'desc')
                      ->paginate(15)
                      ->withQueryString();

        // Get unique modules for the dropdown
        $modules = AuditLog::select('module')->distinct()->orderBy('module')->pluck('module');

       return Inertia::render('SuperAdmin/AuditLogs', [
            'logs'    => $logs,
            'modules' => $modules,
            'filters' => $request->only(['search', 'role', 'module', 'date_from', 'date_to'])
        ]);
    }

    public function clear()
    {
        // Wipe the table entirely and reset auto-incrementing IDs
        AuditLog::truncate();

        // Immediately log the clearing action so the table isn't entirely empty
        AuditLog::logAction('Deleted', 'System Administration', 'SuperAdmin permanently cleared all system audit logs.');

        return redirect()->back()->with('success', 'All system audit logs have been successfully permanently deleted.');
    }
}