<?php

namespace App\Http\Controllers\FeedbackCommittee;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Report;
use Inertia\Inertia;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\File;

class ArchiveController extends Controller
{
    /**
     * Display the repository of archived (soft-deleted) global reports.
     */
    public function index(Request $request)
    {
        $search = trim((string) $request->query('search', ''));
        $tab = $request->query('tab', 'reports');

        // FC strictly only sees Global reports (department_id is null)
        $reportsQuery = Report::with('department')
            ->whereNull('department_id')
            ->where('report_data->metadata->is_deleted', true);

        if (!empty($search)) {
            $like = '%' . $search . '%';
            $reportsQuery->where(function ($q) use ($like) {
                $q->where('report_name', 'LIKE', $like)
                  ->orWhere('report_type', 'LIKE', $like)
                  ->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(report_data, '$.metadata.deleted_at')) LIKE ?", [$like]);
            });
        }

        return Inertia::render('FeedbackCommittee/Archives', [
            'archivedReports' => $tab === 'reports' ? $reportsQuery->orderBy('updated_at', 'desc')->paginate(10)->withQueryString() : [],
            'filters' => $request->only(['search', 'tab'])
        ]);
    }

    /**
     * Restore a soft-deleted global report back to the active FC dashboard.
     */
    public function restore($id)
    {
        $report = Report::where('id', $id)->whereNull('department_id')->firstOrFail();
        
        $reportData = $report->report_data;
        $reportData['metadata']['is_deleted'] = false;
        unset($reportData['metadata']['deleted_at']);
        $report->report_data = $reportData;
        
        if (Schema::hasColumn('reports', 'deleted_at')) {
            $report->deleted_at = null;
        }

        $report->save();

        \App\Models\AuditLog::logAction('Restored', 'Committee Reports', "Restored global report from archive (ID: {$id}).");

        return back()->with('success', 'Overall report successfully restored to your active dashboard.');
    }

    /**
     * Permanently force-delete a global report and instantly wipe its PDF/DOCX files.
     */
    public function forceDelete($id)
    {
        $report = Report::where('id', $id)->whereNull('department_id')->firstOrFail();

        $pdfPath = storage_path("app/reports/{$report->id}.pdf");
        $docxPath = storage_path("app/reports/{$report->id}.docx");

        if (File::exists($pdfPath)) {
            File::delete($pdfPath);
        }
        if (File::exists($docxPath)) {
            File::delete($docxPath);
        }

        $report->delete();

        \App\Models\AuditLog::logAction('Permanently Deleted', 'Committee Reports', "Force-deleted global report and removed physical files (ID: {$id}).");

        return back()->with('success', 'Overall report and all associated files permanently erased.');
    }
}