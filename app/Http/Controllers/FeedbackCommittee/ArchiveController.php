<?php

namespace App\Http\Controllers\FeedbackCommittee;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Report;
use Inertia\Inertia;
use App\Models\AuditLog;
use Illuminate\Support\Facades\File;

class ArchiveController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->only(['search', 'tab']);
        $tab = $filters['tab'] ?? 'reports';

        // FC strictly only sees Global reports (department_id is null)
        $reportsQuery = Report::archivedFiltered($filters)
            ->whereNull('department_id');

        return Inertia::render('FeedbackCommittee/Archives', [
            'archivedReports' => $tab === 'reports' ? $reportsQuery->orderBy('updated_at', 'desc')->paginate(10)->withQueryString() : [],
            'filters' => $filters
        ]);
    }

    public function restore($id)
    {
        $report = Report::where('id', $id)->whereNull('department_id')->firstOrFail();
        
        // Delegate state management to the Model
        $report->restoreFromArchive();

         AuditLog::logAction('Restored', 'Committee Reports', "Restored global report from archive (ID: {$id}).");
        return back()->with('success', 'Overall report successfully restored to your active dashboard.');
    }

    public function forceDelete($id)
    {
        $report = Report::where('id', $id)->whereNull('department_id')->firstOrFail();

        if (File::exists(storage_path("app/reports/{$report->id}.pdf"))) {
            File::delete(storage_path("app/reports/{$report->id}.pdf"));
        }
        if (File::exists(storage_path("app/reports/{$report->id}.docx"))) {
            File::delete(storage_path("app/reports/{$report->id}.docx"));
        }

        // Standard delete acts as force delete here
        $report->delete();

        AuditLog::logAction('Permanently Deleted', 'Committee Reports', "Force-deleted global report and removed physical files (ID: {$id}).");
        return back()->with('success', 'Overall report and all associated files permanently erased.');
    }
}