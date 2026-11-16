<?php

namespace App\Http\Controllers\FocalPerson;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Report;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;

class ArchiveController extends Controller
{
    /**
     * Display the repository of archived (soft-deleted) reports for the Focal Person's department.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $search = trim((string) $request->query('search', ''));
        $tab = $request->query('tab', 'reports');

        $reportsQuery = Report::with('department')
            ->where('department_id', $user->department_id)
            ->where('report_data->metadata->is_deleted', true);

        if (!empty($search)) {
            $like = '%' . $search . '%';
            $reportsQuery->where(function ($q) use ($like) {
                $q->where('report_name', 'LIKE', $like)
                  ->orWhere('report_type', 'LIKE', $like)
                  ->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(report_data, '$.metadata.deleted_at')) LIKE ?", [$like])
                  ->orWhereHas('department', function ($dq) use ($like) {
                      $dq->where('department_name', 'LIKE', $like);
                  });
            });
        }

        return Inertia::render('FocalPerson/Archives', [
            'archivedReports' => $tab === 'reports' ? $reportsQuery->orderBy('updated_at', 'desc')->paginate(10)->withQueryString() : [],
            'filters' => $request->only(['search', 'tab'])
        ]);
    }

    /**
     * Restore a soft-deleted report back to the active Focal Person dashboard.
     */
    public function restore($id)
    {
        $user = Auth::user();
        $report = Report::where('id', $id)->where('department_id', $user->department_id)->firstOrFail();
        
        $reportData = $report->report_data;
        $reportData['metadata']['is_deleted'] = false;
        unset($reportData['metadata']['deleted_at']);
        $report->report_data = $reportData;
        
        if (\Illuminate\Support\Facades\Schema::hasColumn('reports', 'deleted_at')) {
            $report->deleted_at = null;
        }

        $report->save();

        \App\Models\AuditLog::logAction('Restored', 'Local Reports', "Focal Person restored report from archive (ID: {$id}).");

        return back()->with('success', 'Report successfully restored to your active dashboard.');
    }

    /**
     * Permanently force-delete a report and instantly wipe its PDF/DOCX files.
     */
    public function forceDelete($id)
    {
        $user = Auth::user();
        $report = Report::where('id', $id)->where('department_id', $user->department_id)->firstOrFail();

        // 1. Permanently delete the physical files from server storage
        $pdfPath = storage_path("app/reports/{$report->id}.pdf");
        $docxPath = storage_path("app/reports/{$report->id}.docx");

        if (\Illuminate\Support\Facades\File::exists($pdfPath)) {
            \Illuminate\Support\Facades\File::delete($pdfPath);
        }
        if (\Illuminate\Support\Facades\File::exists($docxPath)) {
            \Illuminate\Support\Facades\File::delete($docxPath);
        }

        // 2. Permanently delete the database record
        $report->delete();

        \App\Models\AuditLog::logAction('Permanently Deleted', 'Local Reports', "Focal Person force-deleted report and removed physical files (ID: {$id}).");

        return back()->with('success', 'Report and all associated files permanently erased.');
    }
}