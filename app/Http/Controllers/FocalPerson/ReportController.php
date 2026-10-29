<?php

namespace App\Http\Controllers\FocalPerson;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;
use App\Models\Report;
use App\Models\Department;
use App\Models\AuditLog;
use Inertia\Inertia;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $search = trim((string) $request->query('search', ''));

        // STRICT SCOPE: Only fetch reports belonging to the logged-in Focal Person's department
        $query = Report::with(['generator'])
            ->where('department_id', $user->department_id)
            ->orderBy('created_at', 'desc');

        if (Schema::hasColumn('reports', 'deleted_at')) {
            $query->whereNull('deleted_at');
        }

        if ($search !== '') {
            $like = '%' . $search . '%';
            $query->where(function ($q) use ($like) {
                $q->where('report_name', 'LIKE', $like)
                  ->orWhere('report_type', 'LIKE', $like)
                  ->orWhere('start_date', 'LIKE', $like)
                  ->orWhere('end_date', 'LIKE', $like)
                  ->orWhere('status', 'LIKE', $like);
            });
        }

        $reports = $query->paginate(10)->withQueryString();
        
        // Pass the department to the frontend so it knows whether to request a CC or Non-CC template
        $department = Department::find($user->department_id);

        return Inertia::render('FocalPerson/Reports', [
            'reports'    => $reports,
            'filters'    => ['search' => $search],
            'department' => $department
        ]);
    }

    public function generate(Request $request)
    {
        $user = Auth::user();
        
        $validated = $request->validate([
            'report_name' => 'nullable|string|max:255',
            'start_date'  => 'required|date',
            'end_date'    => 'required|date|after_or_equal:start_date',
            'report_type' => 'required|in:cc,non-cc',
        ]);

        // HARDCODED SECURITY: Force the department ID to the user's assigned department
        $validated['department_id'] = $user->department_id;
        $validated['export_format'] = 'docx';

        $report = Report::generateSnapshot($validated);

        if (!$report) {
            return back()->with('error', 'No feedback data found for your department in this date range.');
        }

        $reportData = $report->report_data;
        $defaultName = ($reportData['metadata']['department'] ?? 'Department') . ' - ' . ($reportData['metadata']['period'] ?? '');
        $customName = trim((string) ($validated['report_name'] ?? ''));
        
        $reportData['metadata']['report_name'] = $customName !== '' ? $customName : $defaultName;
        $report->report_data = $reportData;
        
        if (Schema::hasColumn('reports', 'report_name')) {
            $report->report_name = $reportData['metadata']['report_name'];
        }
        
        // Ensure new reports start as Drafts
        $report->status = 'Draft';
        $report->save();

        AuditLog::logAction('Created', 'Local Reports', "Generated new departmental report: {$reportData['metadata']['report_name']}");

       return redirect()->route('focalperson.reports.index')->with('success', 'Report generated successfully and saved as Draft.');
    }

    public function submitToCommittee($id)
    {
        $user = Auth::user();
        $report = Report::where('id', $id)
            ->where('department_id', $user->department_id) // Security check
            ->firstOrFail();

        if ($report->status === 'Submitted') {
            return back()->with('info', 'This report has already been submitted.');
        }

        $report->status = 'Submitted';
        $report->save();

        AuditLog::logAction('Submitted', 'Local Reports', "Submitted report ID {$report->id} to the Feedback Committee.");

        return back()->with('success', 'Report successfully submitted to the Feedback Committee for review.');
    }
    
    public function destroy($id)
    {
        $user = Auth::user();
        
        // Security check: Only allow deleting if they own it AND it hasn't been submitted yet
        $report = Report::where('id', $id)
            ->where('department_id', $user->department_id)
            ->firstOrFail();
            
        if ($report->status !== 'Draft' && $report->status !== 'Returned') {
            return back()->with('error', 'You cannot delete a report that has already been submitted.');
        }

        if (Schema::hasColumn('reports', 'deleted_at')) {
            $report->deleted_at = now();
            $report->save();
        } else {
            $report->delete();
        }

        AuditLog::logAction('Deleted', 'Local Reports', "Deleted draft report (ID: {$id}).");
        return back()->with('success', 'Draft report removed successfully.');
    }
}