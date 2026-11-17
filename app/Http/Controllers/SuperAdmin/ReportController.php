<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use App\Models\Report;
use App\Models\Department;
use App\Events\SystemDataUpdated;
use App\Services\ReportGenerationService;
use Illuminate\Support\Facades\File;
use App\Services\DocumentGenerationService;
use App\Models\AuditLog;
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
        $departments = $this->getDepartmentsWithTemplateType();
        $search = trim((string) $request->query('search', ''));
        $deptFilter = $request->query('department', 'all');

        $query = Report::with(['department', 'generator'])->orderBy('created_at', 'desc');

        if ($deptFilter === 'global') {
            $query->whereNull('department_id');
        } elseif ($deptFilter !== 'all' && $deptFilter !== '') {
            $query->where('department_id', $deptFilter);
        }

        if (Schema::hasColumn('reports', 'deleted_at')) {
            $query->whereNull('deleted_at');
        }
        
        $query->where(function ($q) {
            $q->whereNull('report_data->metadata->is_deleted')
              ->orWhere('report_data->metadata->is_deleted', false);
        });

        if ($search !== '') {
            $like = '%' . $search . '%';
            $hasReportNameCol = Schema::hasColumn('reports', 'report_name');

            $query->where(function ($q) use ($search, $like, $hasReportNameCol) {
                $q->where('id', 'LIKE', $like)
                  ->orWhere('report_type', 'LIKE', $like)
                  ->orWhere('start_date', 'LIKE', $like)
                  ->orWhere('end_date', 'LIKE', $like)
                  ->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(report_data, '$.metadata.report_name')) LIKE ?", [$like])
                  ->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(report_data, '$.metadata.department')) LIKE ?", [$like])
                  ->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(report_data, '$.metadata.period')) LIKE ?", [$like])
                  ->orWhereHas('department', function ($dq) use ($like) {
                      $dq->where('department_name', 'LIKE', $like);
                  });

                if ($hasReportNameCol) {
                    $q->orWhere('report_name', 'LIKE', $like);
                }

                if (str_contains(strtolower('all departments'), strtolower($search))) {
                    $q->orWhereNull('department_id');
                }
            });
        }

        return Inertia::render('SuperAdmin/Reports', [
            'departments' => $departments,
            'reports'     => $query->paginate(10)->withQueryString(),
            'filters'     => ['search' => $search, 'department' => $deptFilter],
        ]);
    }

    public function generate(Request $request, ReportGenerationService $reportService)
    {
        $validated = $request->validate([
            'report_name'   => 'nullable|string|max:255',
            'department_id' => 'required',
            'start_date'    => 'required|date',
            'end_date'      => 'required|date|after_or_equal:start_date',
            'report_type'   => 'required|in:cc,non-cc',
            'export_format' => 'nullable|in:pdf,excel,docx'
        ]);

        $validated['export_format'] = $validated['export_format'] ?? 'docx';

        $report = in_array($validated['department_id'], ['all_non_cc', 'all_cc']) 
            ? $reportService->generateGlobalSnapshot($validated)
            : $reportService->generateLocalSnapshot($validated);

        if (!$report) {
            return back()->with('error', 'No feedback data found for the selected department and date range.');
        }

        try {
            $this->documentService->compileDocuments($report);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error("Document pre-compile failed for Report {$report->id}: " . $e->getMessage());
        }

        AuditLog::logAction('Created', 'Reports', "Generated new report: {$report->report_data['metadata']['report_name']} (ID: {$report->id}).");
        event(new SystemDataUpdated('superadmin', $validated['department_id']));
        event(new SystemDataUpdated('feedbackcommittee', $validated['department_id']));

        return redirect()->route('superadmin.reports.index')
            ->with('success', 'Report "' . $report->report_data['metadata']['report_name'] . '" compiled and saved to archive.');
    }

    public function destroy($id)
    {
        $report = Report::findOrFail($id);
        $reportName = $report->report_name ?? ($report->report_data['metadata']['report_name'] ?? 'Unnamed Report');
        
        $report->archiveReport();
        
        AuditLog::logAction('Deleted', 'Reports', "Deleted report from archive: {$reportName} (ID: {$id}).");
        return back()->with('success', 'Report removed from active archive.');
    }

    public function restore($id)
    {
        $report = Report::findOrFail($id);
        $report->restoreFromArchive();

        $reportName = $report->report_name ?? ($report->report_data['metadata']['report_name'] ?? 'Unnamed Report');
        AuditLog::logAction('Restored', 'Reports', "Restored report from archive: {$reportName} (ID: {$id}).");
        return back()->with('success', 'Report successfully restored to active dashboards.');
    }

    public function forceDelete($id)
    {
        $report = Report::findOrFail($id);
        $reportName = $report->report_name ?? ($report->report_data['metadata']['report_name'] ?? 'Unnamed Report');

        if (File::exists(storage_path("app/reports/{$report->id}.pdf"))) {
            File::delete(storage_path("app/reports/{$report->id}.pdf"));
        }
        if (File::exists(storage_path("app/reports/{$report->id}.docx"))) {
            File::delete(storage_path("app/reports/{$report->id}.docx"));
        }

        $report->delete();
        AuditLog::logAction('Permanently Deleted', 'Reports', "Force-deleted report and removed physical files: {$reportName} (ID: {$id}).");
        return back()->with('success', 'Report and all associated files permanently erased.');
    }

    public function downloadDocx(Request $request, $id)
    {
        $report = Report::findOrFail($id);
        $docxPath = storage_path('app/reports/' . $report->id . '.docx');

        if (!file_exists($docxPath)) {
            $docxPath = $this->documentService->generateFilledDocx($report);
            if (!$docxPath) {
                return back()->with('error', 'Word template missing from storage directory.');
            }
        }

        $baseTitle = $report->report_data['metadata']['report_name'] ?? "CSM_Report_{$report->report_data['metadata']['department']}_{$report->report_data['metadata']['period']}";
        return response()->download($docxPath, preg_replace('/[^A-Za-z0-9_\-]/', '_', $baseTitle) . '.docx');
    }

    public function downloadPdf(Request $request, $id)
    {
        $report = Report::findOrFail($id);
        $pdfPath = storage_path('app/reports/' . $report->id . '.pdf');

        if (!file_exists($pdfPath) || filesize($pdfPath) === 0) {
            return back()->with('error', 'PDF not found. Please try generating the report again or download the DOCX version.');
        }

        $baseTitle = $report->report_data['metadata']['report_name'] ?? "CSM_Report_{$report->report_data['metadata']['department']}_{$report->report_data['metadata']['period']}";
        return response()->download($pdfPath, preg_replace('/[^A-Za-z0-9_\-]/', '_', $baseTitle) . '.pdf');
    }

    private function getDepartmentsWithTemplateType()
    {
        $departments = Department::orderBy('department_name')->get();
        $formFieldsByDept = DB::table('forms')->join('form_fields', 'forms.form_id', '=', 'form_fields.form_id')
            ->select('forms.department_id', 'form_fields.field_label')->get()->groupBy('department_id');

        return $departments->map(function ($dept) use ($formFieldsByDept) {
            $attrs = $dept->getAttributes();
            $detectedType = null;

            foreach (['classification', 'report_type', 'template_type', 'charter_type', 'type', 'category'] as $col) {
                if (isset($attrs[$col]) && $attrs[$col] !== '') {
                    $val = strtolower(trim((string) $attrs[$col]));
                    if (in_array($val, ['non-cc', 'non_cc', 'noncc', 'without_cc', '0', 'false', 'no'])) { $detectedType = 'non-cc'; break; }
                    if (in_array($val, ['cc', 'with_cc', '1', 'true', 'yes'])) { $detectedType = 'cc'; break; }
                }
            }

            if (!$detectedType && $formFieldsByDept->has($dept->department_id)) {
                $hasCCField = $formFieldsByDept->get($dept->department_id)->pluck('field_label')->contains(function ($label) {
                    $clean = strtolower(str_replace([' ', '_', '-', '.'], '', (string) $label));
                    return str_contains($clean, 'cc1') || str_contains($clean, 'cc2') || str_contains($clean, 'cc3') || str_contains($clean, 'citizen');
                });
                $detectedType = $hasCCField ? 'cc' : 'non-cc';
            }

            $dept->default_report_type = $detectedType ?? 'cc';
            return $dept;
        });
    }
}