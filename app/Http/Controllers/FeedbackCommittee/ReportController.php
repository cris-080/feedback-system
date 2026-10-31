<?php

namespace App\Http\Controllers\FeedbackCommittee;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Report;
use App\Models\Department;
use App\Models\AuditLog;
use Inertia\Inertia;

class ReportController extends Controller
{
    /**
     * Display the repository of submitted reports.
     */
    public function index(Request $request)
    {
        $search = trim((string) $request->query('search', ''));
        $departmentId = $request->query('department_id', '');
        $status = $request->query('status', '');

        // Only show reports that have left the Draft stage
        $query = Report::with(['department', 'generator'])
            ->whereIn('status', ['Submitted', 'Approved', 'Returned'])
            ->orderBy('updated_at', 'desc');

        if ($search !== '') {
            $like = '%' . $search . '%';
            $query->where(function ($q) use ($like) {
                $q->where('report_name', 'LIKE', $like)
                  ->orWhere('report_type', 'LIKE', $like)
                  ->orWhereHas('department', function ($dq) use ($like) {
                      $dq->where('department_name', 'LIKE', $like);
                  });
            });
        }

        if ($departmentId !== '') {
            $query->where('department_id', $departmentId);
        }

        if ($status !== '') {
            $query->where('status', $status);
        }

        $reports = $query->paginate(10)->withQueryString();
        
        // Fetch departments for the filter dropdown
        $departments = Department::orderBy('department_name')->get(['department_id', 'department_name']);

        return Inertia::render('FeedbackCommittee/Reports', [
            'reports'     => $reports,
            'departments' => $departments,
            'filters'     => $request->only(['search', 'department_id', 'status'])
        ]);
    }

    /**
     * Mark a submitted report as Approved.
     */
    public function approve($id)
    {
        $report = Report::where('id', $id)->where('status', 'Submitted')->firstOrFail();
        
        $report->status = 'Approved';
        $report->save();

        AuditLog::logAction('Approved', 'Committee Reports', "Approved departmental report: {$report->report_name}");

        return back()->with('success', 'Report has been officially approved.');
    }

    /**
     * Return a report to the Focal Person with remarks.
     */
    public function returnToSender(Request $request, $id)
    {
        $request->validate(['remarks' => 'required|string']);

        $report = Report::where('id', $id)->where('status', 'Submitted')->firstOrFail();
        
        $report->status = 'Returned';
        
        // Inject the return remarks into the JSON metadata so the Focal Person can read it
        $reportData = $report->report_data;
        $reportData['metadata']['return_remarks'] = $request->input('remarks');
        $reportData['metadata']['returned_at'] = now()->toDateTimeString();
        $report->report_data = $reportData;

        $report->save();

        AuditLog::logAction('Returned', 'Committee Reports', "Returned report '{$report->report_name}' to Focal Person for revisions.");

        return back()->with('success', 'Report returned to Focal Person successfully.');
    }

    /**
     * Forward PDF generation to the SuperAdmin compiler to avoid duplicating LibreOffice logic.
     */
    public function downloadPdf(Request $request, $id)
    {
        // Ensure they are only downloading submitted/approved reports, not someone else's drafts
        Report::where('id', $id)->whereIn('status', ['Submitted', 'Approved', 'Returned'])->firstOrFail();

        return app(\App\Http\Controllers\SuperAdmin\ReportController::class)->downloadPdf($request, $id);
    }
}