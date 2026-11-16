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
    public function index(Request $request)
    {
        $filters = [
            'tab'           => $request->query('tab', 'submissions'),
            'search'        => trim((string) $request->query('search', '')),
            'department_id' => $request->query('department_id', ''),
            'status'        => $request->query('status', ''),
            'report_type'   => $request->query('report_type', ''),
        ];

        $query = Report::with(['department', 'generator']);

        if (\Illuminate\Support\Facades\Schema::hasColumn('reports', 'deleted_at')) {
            $query->whereNull('deleted_at');
        }

        // 1. Outsource all heavy querying logic to the fat model
        $query->filterCommittee($filters);

        // Sort based on the active tab
        $query->orderBy($filters['tab'] === 'global' ? 'created_at' : 'updated_at', 'desc');

        return Inertia::render('FeedbackCommittee/Reports', [
            'reports'     => $query->paginate(10)->withQueryString(),
            'departments' => Department::orderBy('department_name')->get(['department_id', 'department_name']),
            'filters'     => $filters,
        ]);
    }

    public function generate(Request $request)
    {
        // TEMPORARILY DISABLED FOR TESTING: Removed `before_or_equal:today` to allow future dates
        $validated = $request->validate([
            'report_name' => 'nullable|string|max:255',
            'start_date'  => 'required|date',
            'end_date'    => 'required|date|after_or_equal:start_date',
            'report_type' => 'required|in:cc,non-cc',
        ]);

        $hasData = Report::whereNotNull('department_id')
            ->whereIn('status', ['Submitted', 'Approved', 'Returned'])
            ->where(function($q) use ($validated) {
                $q->whereBetween('start_date', [$validated['start_date'], $validated['end_date']])
                  ->orWhereBetween('end_date', [$validated['start_date'], $validated['end_date']]);
            })
            ->exists();

        if (!$hasData) {
            return back()->with('error', 'Cannot compile overall report: No submitted departmental reports found for the selected period.');
        }

        $request->merge([
            'department_id' => $validated['report_type'] === 'cc' ? 'all_cc' : 'all_non_cc',
            'export_format' => 'pdf',
        ]);

        app(\App\Http\Controllers\SuperAdmin\ReportController::class)->generate(
            $request,
            app(\App\Services\ReportGenerationService::class)
        );

        return redirect()->route('feedback_committee.reports.index', ['tab' => 'global'])
            ->with('success', 'Global University-Wide report compiled and saved.');
    }

    public function approve($id)
    {
        $report = Report::where('id', $id)->where('status', 'Submitted')->firstOrFail();
        
        $report->status = 'Approved';
        $report->save();

        AuditLog::logAction('Approved', 'Committee Reports', "Approved departmental report: {$report->report_name}");

        event(new \App\Events\SystemDataUpdated('focalperson', $report->department_id));
        event(new \App\Events\SystemDataUpdated('superadmin', $report->department_id));

        return back()->with('success', 'Report has been officially approved.');
    }

    public function returnToSender(Request $request, $id)
    {
        $request->validate(['remarks' => 'required|string']);

        $report = Report::where('id', $id)->where('status', 'Submitted')->firstOrFail();
        $report->status = 'Returned';
        
        // 2. We keep this small logic inline because it is a very specific action only used here
        $reportData = $report->report_data;
        $reportData['metadata']['return_remarks'] = $request->input('remarks');
        $reportData['metadata']['returned_at'] = now()->toDateTimeString();
        $report->report_data = $reportData;
        $report->save();

        AuditLog::logAction('Returned', 'Committee Reports', "Returned report '{$report->report_name}' to Focal Person for revisions.");
        event(new \App\Events\SystemDataUpdated('focalperson', $report->department_id));

        return back()->with('success', 'Report returned to Focal Person successfully.');
    }

    public function destroy($id)
    {
        $report = Report::where('id', $id)->whereNull('department_id')->firstOrFail();
        
        // 3. Delegate to the Model!
        $report->archiveReport();

        $reportName = $report->report_name ?? ($report->report_data['metadata']['report_name'] ?? 'Unnamed Report');
        AuditLog::logAction('Deleted', 'Committee Reports', "Deleted global report: {$reportName} (ID: {$id}).");

        return back()->with('success', 'Overall report moved to System Archives.');
    }

    public function downloadPdf(Request $request, $id)
    {
        Report::where('id', $id)->where(function ($q) {
            $q->whereNull('department_id')
              ->orWhereIn('status', ['Submitted', 'Approved', 'Returned']);
        })->firstOrFail();

        return app(\App\Http\Controllers\SuperAdmin\ReportController::class)->downloadPdf($request, $id);
    }
}