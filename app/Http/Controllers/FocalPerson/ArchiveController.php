<?php

namespace App\Http\Controllers\FocalPerson;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\File;
use Illuminate\Http\Request;
use App\Models\Report;
use Inertia\Inertia;
use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;

class ArchiveController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->only(['search', 'tab']);
        $tab = $filters['tab'] ?? 'reports';
        $user = Auth::user();

        // Filter the model scope by the Focal Person's department ID
        $reportsQuery = Report::archivedFiltered($filters)
            ->where('department_id', $user->department_id);

        return Inertia::render('FocalPerson/Archives', [
            'archivedReports' => $tab === 'reports' ? $reportsQuery->orderBy('updated_at', 'desc')->paginate(10)->withQueryString() : [],
            'filters' => $filters
        ]);
    }

    public function restore($id)
    {
        $report = Report::where('id', $id)->where('department_id', Auth::user()->department_id)->firstOrFail();
        
        // Delegate to the Fat Model
        $report->restoreFromArchive();

        AuditLog::logAction('Restored', 'Local Reports', "Focal Person restored report from archive (ID: {$id}).");
        return back()->with('success', 'Report successfully restored to your active dashboard.');
    }

    public function forceDelete($id)
    {
        $report = Report::where('id', $id)->where('department_id', Auth::user()->department_id)->firstOrFail();

        if (File::exists(storage_path("app/reports/{$report->id}.pdf"))) {
            File::delete(storage_path("app/reports/{$report->id}.pdf"));
        }
        if (File::exists(storage_path("app/reports/{$report->id}.docx"))) {
            File::delete(storage_path("app/reports/{$report->id}.docx"));
        }

        // Standard delete acts as force delete here
        $report->delete();

        AuditLog::logAction('Permanently Deleted', 'Local Reports', "Focal Person force-deleted report and removed physical files (ID: {$id}).");
        return back()->with('success', 'Report and all associated files permanently erased.');
    }
}