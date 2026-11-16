<?php

namespace App\Http\Controllers\FocalPerson;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;
use App\Models\Report;
use App\Models\Department;
use App\Models\AuditLog;
use App\Services\ReportGenerationService;
use App\Services\DocumentGenerationService;
use Inertia\Inertia;

class ReportController extends Controller
{
    /**
     * @var DocumentGenerationService
     */
    protected $documentService;

    public function __construct(DocumentGenerationService $documentService)
    {
        $this->documentService = $documentService;
    }

    public function index(Request $request)
    {
        $user = Auth::user();
        $search = trim((string) $request->query('search', ''));

        $query = Report::with(['generator'])
            ->where('department_id', $user->department_id)
            ->orderBy('created_at', 'desc');

        if (Schema::hasColumn('reports', 'deleted_at')) {
            $query->whereNull('deleted_at');
        }

        // Hide soft-deleted reports from the active dashboard
        $query->where(function ($q) {
            $q->whereNull('report_data->metadata->is_deleted')
              ->orWhere('report_data->metadata->is_deleted', false);
        });

        // Use the new Model scope
        $query->filter($search);

        return Inertia::render('FocalPerson/Reports', [
            'reports'    => $query->paginate(10)->withQueryString(),
            'filters'    => ['search' => $search],
            'department' => Department::find($user->department_id)
        ]);
    }

    public function generate(Request $request, ReportGenerationService $reportService)
    {
        $user = Auth::user();
        
        $validated = $request->validate([
            'report_name' => 'nullable|string|max:255',
            'start_date'  => 'required|date',
            'end_date'    => 'required|date|after_or_equal:start_date',
            'report_type' => 'required|in:cc,non-cc',
        ]);

        $validated['department_id'] = $user->department_id;
        $validated['export_format'] = 'pdf';

        $existingReport = Report::where('department_id', $validated['department_id'])
            ->where('report_type', $validated['report_type'])
            ->where('start_date', $validated['start_date'])
            ->where('end_date', $validated['end_date'])
            ->where(function ($query) {
                if (Schema::hasColumn('reports', 'deleted_at')) {
                    $query->whereNull('deleted_at');
                }
            })
            ->first();

        if ($existingReport) {
            if (in_array($existingReport->status, ['Submitted', 'Approved'])) {
                return back()->with('error', 'A ' . strtoupper($validated['report_type']) . ' report for this date range has already been submitted to the committee.');
            }
            if (Schema::hasColumn('reports', 'deleted_at')) {
                $existingReport->deleted_at = now();
                $existingReport->save();
            } else {
                $existingReport->delete();
            }
        }

        $report = $reportService->generateLocalSnapshot($validated);

        if (!$report) {
            return back()->with('error', 'No feedback data found for your department in this date range.');
        }
        
        $report->status = 'Draft';
        $report->save();

        try {
            // Outsource document generation to the service!
            $this->documentService->compileDocuments($report);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error("Document pre-compile failed for Report {$report->id}: " . $e->getMessage());
        }

        AuditLog::logAction('Created', 'Local Reports', "Generated new departmental report: {$report->report_data['metadata']['report_name']}");

        return redirect()->route('focalperson.reports.index')->with('success', 'Report generated successfully and saved as Draft.');
    }

    public function submitToCommittee($id)
    {
        $user = Auth::user();
        $report = Report::where('id', $id)->where('department_id', $user->department_id)->firstOrFail();

        if ($report->status === 'Submitted') {
            return back()->with('info', 'This report has already been submitted.');
        }

        $report->status = 'Submitted';
        $report->save();

        AuditLog::logAction('Submitted', 'Local Reports', "Submitted report ID {$report->id} to the Feedback Committee.");

        event(new \App\Events\SystemDataUpdated('feedbackcommittee', $report->department_id));
        event(new \App\Events\SystemDataUpdated('superadmin', $report->department_id));

        return back()->with('success', 'Report successfully submitted to the Feedback Committee for review.');
    }

    public function recall($id)
    {
        $user = Auth::user();
        $report = Report::where('id', $id)->where('department_id', $user->department_id)->firstOrFail();

        if ($report->status !== 'Submitted') {
            return back()->with('error', 'You can only recall reports that are still pending committee review.');
        }

        $report->status = 'Draft';
        $report->save();

        AuditLog::logAction('Recalled', 'Local Reports', "Recalled report ID {$report->id} from the Feedback Committee.");

        event(new \App\Events\SystemDataUpdated('feedbackcommittee', $report->department_id));
        event(new \App\Events\SystemDataUpdated('superadmin', $report->department_id));

        return back()->with('success', 'Report successfully recalled and reverted to a Draft.');
    }

    public function destroy($id)
    {
        $user = Auth::user();
        $report = Report::where('id', $id)->where('department_id', $user->department_id)->firstOrFail();
            
        if ($report->status !== 'Draft' && $report->status !== 'Returned') {
            return back()->with('error', 'You cannot delete a report that has already been submitted.');
        }

        // Delegate logic to the fat model
        $report->archiveReport();

        AuditLog::logAction('Deleted', 'Local Reports', "Deleted draft report (ID: {$id}).");
        
        return back()->with('success', 'Draft report moved to your department archive.');
    }

    public function downloadDocx(Request $request, $id)
    {
        $user = Auth::user();
        Report::where('id', $id)->where('department_id', $user->department_id)->firstOrFail();
        
        return app(\App\Http\Controllers\SuperAdmin\ReportController::class)->downloadDocx($request, $id);
    }

    public function downloadPdf(Request $request, $id)
    {
        $user = Auth::user();
        Report::where('id', $id)->where('department_id', $user->department_id)->firstOrFail();
        
        return app(\App\Http\Controllers\SuperAdmin\ReportController::class)->downloadPdf($request, $id);
    }
}