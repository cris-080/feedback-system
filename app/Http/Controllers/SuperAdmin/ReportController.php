<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use App\Models\Report;
use App\Models\Department;
use App\Models\AuditLog;
use Symfony\Component\Process\Process;
use Inertia\Inertia;

class ReportController extends Controller
{
   public function index(Request $request)
    {
        $departments = $this->getDepartmentsWithTemplateType();
        $search = trim((string) $request->query('search', ''));

        $query = Report::with(['department', 'generator'])
            ->orderBy('created_at', 'desc');

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

        $reports = $query->paginate(10)->withQueryString();

        return Inertia::render('SuperAdmin/Reports', [
            'departments' => $departments,
            'reports'     => $reports,
            'filters'     => ['search' => $search],
        ]);
    }
    public function generate(Request $request)
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

        $report = Report::generateSnapshot($validated);

        if (!$report) {
            return back()->with('error', 'No feedback data found for the selected department and date range.');
        }

        $reportData = $report->report_data;
        
        // Force the correct display name and type for the Overall templates
        if ($validated['department_id'] === 'all_non_cc') {
            $reportData['metadata']['department'] = 'University-Wide Summary (Non-CC)';
            $report->report_type = 'non-cc';
            $reportData['metadata']['type'] = 'non-cc';
        } elseif ($validated['department_id'] === 'all_cc') {
            $reportData['metadata']['department'] = 'University-Wide Summary (With CC)';
            $report->report_type = 'cc';
            $reportData['metadata']['type'] = 'cc';
        }
        
        $defaultName = ($reportData['metadata']['department'] ?? 'Department') . ' - ' . ($reportData['metadata']['period'] ?? '');
        $customName = trim((string) ($validated['report_name'] ?? ''));
        $reportData['metadata']['report_name'] = $customName !== '' ? $customName : $defaultName;

       $report->report_data = $reportData;
        if (Schema::hasColumn('reports', 'report_name')) {
            $report->report_name = $reportData['metadata']['report_name'];
        }
        $report->save();

        // --- AUDIT TRAIL ---
        AuditLog::logAction('Created', 'Reports', "Generated new report: {$reportData['metadata']['report_name']} (ID: {$report->id}).");

        return redirect()->route('superadmin.reports.index')
            ->with('success', 'Report "' . $reportData['metadata']['report_name'] . '" compiled and saved to archive.');
    }

    /**
     * Soft-delete a generated report
     */
    public function destroy($id)
    {
        $report = Report::findOrFail($id);
        
        $reportName = $report->report_name ?? ($report->report_data['metadata']['report_name'] ?? 'Unnamed Report');

        $reportData = $report->report_data;
        $reportData['metadata']['is_deleted'] = true;
        $reportData['metadata']['deleted_at'] = now()->toDateTimeString();
        $report->report_data = $reportData;

        if (Schema::hasColumn('reports', 'deleted_at')) {
            $report->deleted_at = now();
        }

        $report->save();
        
        // --- AUDIT TRAIL ---
        AuditLog::logAction('Deleted', 'Reports', "Deleted report from archive: {$reportName} (ID: {$id}).");

        return back()->with('success', 'Report removed from active archive.');
    }

    public function show($id)
    {
        return redirect()->route('superadmin.reports.index');
    }

    /**
     * Download the snapshot as a filled Word Document Template (.docx).
     */
    public function downloadDocx(Request $request, $id)
    {
        $report = Report::findOrFail($id);
        $tempDocx = $this->generateFilledDocx($report);

        if (!$tempDocx) {
            return back()->with('error', 'Word template missing from storage/app/templates directory.');
        }

        $baseTitle = $report->report_data['metadata']['report_name']
            ?? "CSM_Report_{$report->report_data['metadata']['department']}_{$report->report_data['metadata']['period']}";
        $fileName = preg_replace('/[^A-Za-z0-9_\-]/', '_', $baseTitle) . '.docx';

        return response()->download($tempDocx, $fileName)->deleteFileAfterSend(true);
    }

    /**
     * Convert the filled Word template to a 1:1 PDF via headless LibreOffice.
     * Automatically falls back to a print-ready HTML document when ?preview=1 is requested and LibreOffice is unavailable.
     */
    public function downloadPdf(Request $request, $id)
    {
        $report = Report::findOrFail($id);
        $workDir = storage_path('app/temp');
        File::ensureDirectoryExists($workDir);

        $cachedPdfPath = $workDir . DIRECTORY_SEPARATOR . "cached_report_{$report->id}_{$report->report_type}.pdf";

        if (!file_exists($cachedPdfPath) || filesize($cachedPdfPath) === 0) {
            @unlink($cachedPdfPath);

            $binary = $this->resolveLibreOfficeBinary();

            // If LibreOffice is not installed on the server, return an error
            if (!$binary) {
                return back()->with('error', 'LibreOffice is not installed on this server. Please download as DOCX.');
            }

            $tempDocx = $this->generateFilledDocx($report);

            if (!$tempDocx) {
                return back()->with('error', 'Word template missing from storage/app/templates directory.');
            }

           $generatedPdf = preg_replace('/\.docx$/i', '.pdf', $tempDocx);

            // Normalize paths to forward slashes for LibreOffice CLI compatibility on Windows
            $outDirArg = str_replace('\\', '/', $workDir);
            $docPathArg = str_replace('\\', '/', $tempDocx);

            // Preserve Windows system environment variables required by soffice.bin when LibreOffice is closed
            $env = [
                'SystemRoot'  => getenv('SystemRoot') ?: 'C:\\Windows',
                'TEMP'        => sys_get_temp_dir(),
                'TMP'         => sys_get_temp_dir(),
                'APPDATA'     => getenv('APPDATA') ?: sys_get_temp_dir(),
                'LOCALAPPDATA'=> getenv('LOCALAPPDATA') ?: sys_get_temp_dir(),
                'USERPROFILE' => getenv('USERPROFILE') ?: sys_get_temp_dir(),
                'PATH'        => getenv('PATH') ?: '',
            ];

            try {
                // Attempt 1: Use default user profile with full Windows environment (works whether LibreOffice is open or closed)
                $process = new Process([
                    $binary,
                    '--headless',
                    '--nologo',
                    '--nofirststartwizard',
                    '--norestore',
                    '--nolockcheck',
                    '--convert-to',
                    'pdf',
                    '--outdir',
                    $outDirArg,
                    $docPathArg,
                ], null, $env);
                $process->setTimeout(120);
                $process->run();

                // Attempt 2: Isolated profile in sys_get_temp_dir() (guaranteed no spaces in folder name)
                if (!file_exists($generatedPdf) || filesize($generatedPdf) === 0) {
                    $loProfileDir = str_replace('\\', '/', sys_get_temp_dir()) . '/clsu_lo_profile';
                    File::ensureDirectoryExists($loProfileDir);
                    $userInstallationArg = '-env:UserInstallation=file:///' . ltrim($loProfileDir, '/');

                    $fallbackProcess = new Process([
                        $binary,
                        $userInstallationArg,
                        '--headless',
                        '--nologo',
                        '--nofirststartwizard',
                        '--norestore',
                        '--nolockcheck',
                        '--convert-to',
                        'pdf',
                        '--outdir',
                        $outDirArg,
                        $docPathArg,
                    ], null, $env);
                    $fallbackProcess->setTimeout(120);
                    $fallbackProcess->run();
                }
            } catch (\Throwable $e) {
                // Process execution disabled or failed on restricted hosting
            }

            @unlink($tempDocx);

            // If PDF conversion failed, return an error
            if (!file_exists($generatedPdf) || filesize($generatedPdf) === 0) {
                return back()->with('error', 'PDF conversion unavailable on this server. Please download as DOCX instead.');
            }

            @rename($generatedPdf, $cachedPdfPath);
        }

        $baseTitle = $report->report_data['metadata']['report_name']
            ?? "CSM_Report_{$report->report_data['metadata']['department']}_{$report->report_data['metadata']['period']}";
        $fileName = preg_replace('/[^A-Za-z0-9_\-]/', '_', $baseTitle) . '.pdf';

        return response()->download($cachedPdfPath, $fileName);
    }

    /**
     * Extracts the CLSU top header banner (wide aspect ratio) and watermark seal (square aspect ratio)
     * from inside cc_template.docx / non-cc_template.docx as Base64 data URIs.
     */
    private function extractTemplateImages(bool $isCC): array
    {
        $result = ['banner' => null, 'watermark' => null];

        if (!class_exists(\ZipArchive::class)) {
            return $result;
        }

        $templatePath = $isCC
            ? storage_path('app/templates/cc_template.docx')
            : (file_exists(storage_path('app/templates/non-cc_template.docx'))
                ? storage_path('app/templates/non-cc_template.docx')
                : storage_path('app/templates/non_cc_template.docx'));

        if (!file_exists($templatePath)) {
            return $result;
        }

        $zip = new \ZipArchive();
        if ($zip->open($templatePath) === true) {
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $stat = $zip->statIndex($i);
                if (!empty($stat['name']) && str_starts_with($stat['name'], 'word/media/image')) {
                    $imgContent = $zip->getFromIndex($i);
                    if ($imgContent === false) continue;

                    $info = @getimagesizefromstring($imgContent);
                    $ext = strtolower(pathinfo($stat['name'], PATHINFO_EXTENSION));
                    $mime = ($ext === 'jpg' || $ext === 'jpeg') ? 'image/jpeg' : 'image/png';
                    $dataUri = 'data:' . $mime . ';base64,' . base64_encode($imgContent);

                    if ($info && $info[0] > 0 && $info[1] > 0) {
                        $ratio = $info[0] / $info[1];
                        // Wide image is the top CLSU banner; square/round image is the background watermark seal
                        if ($ratio > 2.2 && !$result['banner']) {
                            $result['banner'] = $dataUri;
                        } elseif ($ratio <= 2.2 && !$result['watermark']) {
                            $result['watermark'] = $dataUri;
                        }
                    } elseif (!$result['banner']) {
                        $result['banner'] = $dataUri;
                    }
                }
            }
            $zip->close();
        }

        return $result;
    }

    /**
     * Shared CC1/CC2/CC3 mapping helper used by both DOCX generation and HTML Print Fallback.
     */
    private function resolveCCMetrics(array $data): array
    {
        $ccData = [
            'cc1_1' => ['c' => 0, 'p' => 0], 'cc1_2' => ['c' => 0, 'p' => 0], 'cc1_3' => ['c' => 0, 'p' => 0], 'cc1_4' => ['c' => 0, 'p' => 0],
            'cc2_1' => ['c' => 0, 'p' => 0], 'cc2_2' => ['c' => 0, 'p' => 0], 'cc2_3' => ['c' => 0, 'p' => 0], 'cc2_4' => ['c' => 0, 'p' => 0], 'cc2_5' => ['c' => 0, 'p' => 0],
            'cc3_1' => ['c' => 0, 'p' => 0], 'cc3_2' => ['c' => 0, 'p' => 0], 'cc3_3' => ['c' => 0, 'p' => 0], 'cc3_4' => ['c' => 0, 'p' => 0]
        ];

        foreach (['cc1', 'cc2', 'cc3'] as $ccKey) {
            if (!isset($data['cc_metrics'][$ccKey])) continue;

            foreach ($data['cc_metrics'][$ccKey] as $dbLabel => $metrics) {
                $c = $metrics['count'] ?? 0;
                $p = $metrics['percent'] ?? 0;
                if ($c <= 0) continue;

                $labelLower = strtolower(trim($dbLabel));

                if ($ccKey === 'cc1') {
                    if (str_contains($labelLower, 'do not know') || str_contains($labelLower, 'not know') || str_contains($labelLower, 'did not see one') || str_starts_with($labelLower, '4')) {
                        $ccData['cc1_4'] = ['c' => $c, 'p' => $p];
                    } elseif (str_contains($labelLower, 'learned') || str_starts_with($labelLower, '3')) {
                        $ccData['cc1_3'] = ['c' => $c, 'p' => $p];
                    } elseif (str_contains($labelLower, 'did not see') || str_contains($labelLower, 'but') || str_starts_with($labelLower, '2')) {
                        $ccData['cc1_2'] = ['c' => $c, 'p' => $p];
                    } elseif (str_contains($labelLower, 'saw') || str_starts_with($labelLower, '1')) {
                        $ccData['cc1_1'] = ['c' => $c, 'p' => $p];
                    }
                } elseif ($ccKey === 'cc2') {
                    if (str_contains($labelLower, 'somewhat') || str_starts_with($labelLower, '2')) {
                        $ccData['cc2_2'] = ['c' => $c, 'p' => $p];
                    } elseif (str_contains($labelLower, 'difficult') || str_starts_with($labelLower, '3')) {
                        $ccData['cc2_3'] = ['c' => $c, 'p' => $p];
                    } elseif (str_contains($labelLower, 'not visible') || str_starts_with($labelLower, '4')) {
                        $ccData['cc2_4'] = ['c' => $c, 'p' => $p];
                    } elseif (str_contains($labelLower, 'easy') || str_starts_with($labelLower, '1')) {
                        $ccData['cc2_1'] = ['c' => $c, 'p' => $p];
                    }
                } elseif ($ccKey === 'cc3') {
                    if (str_contains($labelLower, 'very much') || str_starts_with($labelLower, '1')) {
                        $ccData['cc3_1'] = ['c' => $c, 'p' => $p];
                    } elseif (str_contains($labelLower, 'somewhat') || str_starts_with($labelLower, '2')) {
                        $ccData['cc3_2'] = ['c' => $c, 'p' => $p];
                    } elseif (str_contains($labelLower, 'did not help') || str_starts_with($labelLower, '3')) {
                        $ccData['cc3_3'] = ['c' => $c, 'p' => $p];
                    }
                }
            }
        }

        $totalCC1 = $ccData['cc1_1']['c'] + $ccData['cc1_2']['c'] + $ccData['cc1_3']['c'] + $ccData['cc1_4']['c'];
        if ($totalCC1 === 0 && isset($data['cc_metrics']['cc3']['N/A']) && ($data['cc_metrics']['cc3']['N/A']['count'] ?? 0) > 0) {
            $ccData['cc1_4'] = [
                'c' => $data['cc_metrics']['cc3']['N/A']['count'],
                'p' => $data['cc_metrics']['cc3']['N/A']['percent']
            ];
        }

        return $ccData;
    }

    /**
     * Determines each department's template type ('cc' vs 'non-cc') for automatic frontend syncing.
     */
    private function getDepartmentsWithTemplateType()
    {
        $departments = Department::orderBy('department_name')->get();

        $formFieldsByDept = DB::table('forms')
            ->join('form_fields', 'forms.form_id', '=', 'form_fields.form_id')
            ->select('forms.department_id', 'form_fields.field_label')
            ->get()
            ->groupBy('department_id');

        return $departments->map(function ($dept) use ($formFieldsByDept) {
            $attrs = $dept->getAttributes();
            $detectedType = null;

            foreach (['classification', 'report_type', 'template_type', 'charter_type', 'type', 'category'] as $col) {
                if (isset($attrs[$col]) && $attrs[$col] !== '') {
                    $val = strtolower(trim((string) $attrs[$col]));
                    if (in_array($val, ['non-cc', 'non_cc', 'noncc', 'without_cc', '0', 'false', 'no'])) {
                        $detectedType = 'non-cc';
                        break;
                    }
                    if (in_array($val, ['cc', 'with_cc', '1', 'true', 'yes'])) {
                        $detectedType = 'cc';
                        break;
                    }
                }
            }

            if (!$detectedType) {
                foreach (['is_cc', 'has_cc', 'with_cc', 'citizens_charter'] as $boolCol) {
                    if (array_key_exists($boolCol, $attrs) && $attrs[$boolCol] !== null) {
                        $detectedType = filter_var($attrs[$boolCol], FILTER_VALIDATE_BOOLEAN) ? 'cc' : 'non-cc';
                        break;
                    }
                }
            }

            if (!$detectedType && $formFieldsByDept->has($dept->department_id)) {
                $labels = $formFieldsByDept->get($dept->department_id)->pluck('field_label');
                $hasCCField = $labels->contains(function ($label) {
                    $clean = strtolower(str_replace([' ', '_', '-', '.'], '', (string) $label));
                    return str_contains($clean, 'cc1') || str_contains($clean, 'cc2') || str_contains($clean, 'cc3') || str_contains($clean, 'citizen');
                });
                $detectedType = $hasCCField ? 'cc' : 'non-cc';
            }

            $dept->default_report_type = $detectedType ?? 'cc';
            return $dept;
        });
    }

    /**
     * Shared logic: Populates the Word template (cc_template.docx or non-cc_template.docx)
     * and returns the temporary .docx file path inside storage/app/temp.
     */
    private function generateFilledDocx(Report $report): ?string
    {
        $data = $report->report_data;
        $departmentName = $data['metadata']['department'] ?? '';
        $isGlobal = str_contains(strtolower($departmentName), 'all departments') || str_contains(strtolower($departmentName), 'university-wide');

        // Target the appropriate template
        if ($isGlobal) {
            $templatePath = storage_path('app/templates/cc_overall_template.docx');
        } elseif ($report->report_type === 'cc') {
            $templatePath = storage_path('app/templates/cc_template.docx');
        } else {
            $hyphenPath = storage_path('app/templates/non-cc_template.docx');
            $underscorePath = storage_path('app/templates/non_cc_template.docx');
            $templatePath = file_exists($hyphenPath) ? $hyphenPath : $underscorePath;
        }

        if (!file_exists($templatePath)) {
            return null;
        }

        $templateProcessor = new \PhpOffice\PhpWord\TemplateProcessor($templatePath);

        // 1. Basic Metadata
        $templateProcessor->setValue('department', htmlspecialchars($data['metadata']['department']));
        $templateProcessor->setValue('period', htmlspecialchars($data['metadata']['period']));
        $templateProcessor->setValue('total_respondents', $data['metadata']['total_respondents']);

        // 2. Demographics
        $templateProcessor->setValue('ct_cit', $data['demographics']['client_type']['Citizen']['count'] ?? 0);
        $templateProcessor->setValue('ct_cit_p', ($data['demographics']['client_type']['Citizen']['percent'] ?? 0) . '%');
        $templateProcessor->setValue('ct_bus', $data['demographics']['client_type']['Business']['count'] ?? 0);
        $templateProcessor->setValue('ct_bus_p', ($data['demographics']['client_type']['Business']['percent'] ?? 0) . '%');
        $templateProcessor->setValue('ct_gov', $data['demographics']['client_type']['Government']['count'] ?? 0);
        $templateProcessor->setValue('ct_gov_p', ($data['demographics']['client_type']['Government']['percent'] ?? 0) . '%');

        $templateProcessor->setValue('sex_m', $data['demographics']['sex']['Male']['count'] ?? 0);
        $templateProcessor->setValue('sex_m_p', ($data['demographics']['sex']['Male']['percent'] ?? 0) . '%');
        $templateProcessor->setValue('sex_f', $data['demographics']['sex']['Female']['count'] ?? 0);
        $templateProcessor->setValue('sex_f_p', ($data['demographics']['sex']['Female']['percent'] ?? 0) . '%');
        $templateProcessor->setValue('sex_na', $data['demographics']['sex']['Prefer not to say']['count'] ?? 0);
        $templateProcessor->setValue('sex_na_p', ($data['demographics']['sex']['Prefer not to say']['percent'] ?? 0) . '%');

       // 3. Dynamic Region Block (Table 4)
        if ($isGlobal) {
            $regions = [];
            foreach ($data['demographics']['region'] ?? [] as $name => $metrics) {
                $regions[] = [
                    'region_name' => htmlspecialchars($name),
                    'region_freq' => $metrics['count'],
                    'region_pct'  => $metrics['percent'] . '%'
                ];
            }
            
            try {
                if (count($regions) > 0) {
                    $templateProcessor->cloneRowAndSetValues('region_name', $regions);
                } else {
                    $templateProcessor->setValue('region_name', 'N/A');
                    $templateProcessor->setValue('region_freq', '0');
                    $templateProcessor->setValue('region_pct', '0%');
                }
            } catch (\Exception $e) {}
        }

       // 4. Overall ARTA Structure (Tables 1, 2, 3)
        if ($isGlobal && isset($data['table2_data'])) {
            // Table 1: CC Formulas
            $templateProcessor->setValue('cc_awareness_pct', ($data['cc_formulas']['cc1_aware'] ?? 0) . '%');
            $templateProcessor->setValue('cc_visibility_pct', ($data['cc_formulas']['cc2_visible'] ?? 0) . '%');
            $templateProcessor->setValue('cc_helpfulness_pct', ($data['cc_formulas']['cc3_helpful'] ?? 0) . '%');
            $templateProcessor->setValue('response_rate_pct', '100%'); 
            $templateProcessor->setValue('overall_score_pct', ($data['cc_formulas']['overall'] ?? 0) . '%');

            // Tables 2 & 3: Format as multi-line strings using native Word break tags
            $extTotalResponses = 0; $extTotalTrans = 0;
            $intTotalResponses = 0; $intTotalTrans = 0;

            $extServicesArr = []; $extRespArr = []; $extTransArr = [];
            $intServicesArr = []; $intRespArr = []; $intTransArr = [];
            $zeroServicesArr = [];

            foreach (['external', 'internal'] as $scope) {
                foreach ($data['table2_data'][$scope] ?? [] as $deptName => $services) {
                    foreach ($services as $svcName => $count) {
                        $combinedName = htmlspecialchars($deptName) . ' - ' . htmlspecialchars($svcName);
                        if ($count > 0) {
                            if ($scope === 'external') { 
                                $extServicesArr[] = $combinedName;
                                $extRespArr[] = $count;
                                $extTransArr[] = $count;
                                $extTotalResponses += $count; 
                                $extTotalTrans += $count; 
                            }
                            if ($scope === 'internal') { 
                                $intServicesArr[] = $combinedName;
                                $intRespArr[] = $count;
                                $intTransArr[] = $count;
                                $intTotalResponses += $count; 
                                $intTotalTrans += $count; 
                            }
                        } else {
                            $zeroServicesArr[] = $combinedName;
                        }
                    }
                }
            }

            // Bind Totals
            $templateProcessor->setValue('ext_total_responses', $extTotalResponses);
            $templateProcessor->setValue('ext_total_transactions', $extTotalTrans);
            $templateProcessor->setValue('int_total_responses', $intTotalResponses);
            $templateProcessor->setValue('int_total_transactions', $intTotalTrans);
            $templateProcessor->setValue('total_responses', $extTotalResponses + $intTotalResponses);
            $templateProcessor->setValue('total_transactions', $extTotalTrans + $intTotalTrans);

           // Bind Formatted Multi-Line Lists using proper Word XML line breaks
            $lb = '</w:t><w:br/><w:t>';
            
            $templateProcessor->setValue('ext_services_list', empty($extServicesArr) ? 'None' : implode($lb, $extServicesArr));
            $templateProcessor->setValue('ext_resp_list', empty($extRespArr) ? '0' : implode($lb, $extRespArr));
            $templateProcessor->setValue('ext_trans_list', empty($extTransArr) ? '0' : implode($lb, $extTransArr));

            $templateProcessor->setValue('int_services_list', empty($intServicesArr) ? 'None' : implode($lb, $intServicesArr));
            $templateProcessor->setValue('int_resp_list', empty($intRespArr) ? '0' : implode($lb, $intRespArr));
            $templateProcessor->setValue('int_trans_list', empty($intTransArr) ? '0' : implode($lb, $intTransArr));

            $templateProcessor->setValue('zero_services_list', empty($zeroServicesArr) ? 'None' : implode($lb, $zeroServicesArr));
        }

        // 5. CC Math (Tables 5)
        if ($report->report_type === 'cc') {
            $ccData = $this->resolveCCMetrics($data);
            for ($i = 1; $i <= 4; $i++) {
                $templateProcessor->setValue("cc1_{$i}_c", $ccData["cc1_{$i}"]['c'] > 0 ? $ccData["cc1_{$i}"]['c'] : '');
                $templateProcessor->setValue("cc1_{$i}_p", $ccData["cc1_{$i}"]['c'] > 0 ? $ccData["cc1_{$i}"]['p'] . '%' : '');
            }
            for ($i = 1; $i <= 5; $i++) {
                if ($i === 5) {
                    $templateProcessor->setValue("cc2_{$i}_c", ''); $templateProcessor->setValue("cc2_{$i}_p", '');
                } else {
                    $templateProcessor->setValue("cc2_{$i}_c", $ccData["cc2_{$i}"]['c'] > 0 ? $ccData["cc2_{$i}"]['c'] : '');
                    $templateProcessor->setValue("cc2_{$i}_p", $ccData["cc2_{$i}"]['c'] > 0 ? $ccData["cc2_{$i}"]['p'] . '%' : '');
                }
            }
            for ($i = 1; $i <= 4; $i++) {
                if ($i === 4) {
                    $templateProcessor->setValue("cc3_{$i}_c", ''); $templateProcessor->setValue("cc3_{$i}_p", '');
                } else {
                    $templateProcessor->setValue("cc3_{$i}_c", $ccData["cc3_{$i}"]['c'] > 0 ? $ccData["cc3_{$i}"]['c'] : '');
                    $templateProcessor->setValue("cc3_{$i}_p", $ccData["cc3_{$i}"]['c'] > 0 ? $ccData["cc3_{$i}"]['p'] . '%' : '');
                }
            }
        }

        // 6. SQD Matrix Processing
        $sqdKeys = ['sqd0', 'sqd1', 'sqd2', 'sqd3', 'sqd4', 'sqd5', 'sqd6', 'sqd7', 'sqd8'];

        if ($isGlobal && isset($data['sqd_metrics']['overall'])) {
            // Mapping for Overall Template (Scopes: overall, internal, external)
            foreach (['overall' => '', 'internal' => 'int_', 'external' => 'ext_'] as $scope => $prefix) {
                $totalSatData = $data['sqd_metrics'][$scope]['overall_satisfaction'] ?? null;
                if ($totalSatData) {
                    // Populate Table 6, 7, 8 (SQD0 rows)
                    $templateProcessor->setValue("{$prefix}overall_sat_5", $totalSatData['counts']['5']);
                    $templateProcessor->setValue("{$prefix}overall_sat_4", $totalSatData['counts']['4']);
                    $templateProcessor->setValue("{$prefix}overall_sat_3", $totalSatData['counts']['3']);
                    $templateProcessor->setValue("{$prefix}overall_sat_2", $totalSatData['counts']['2']);
                    $templateProcessor->setValue("{$prefix}overall_sat_1", $totalSatData['counts']['1']);
                    $templateProcessor->setValue("{$prefix}overall_sat_na", $totalSatData['counts']['na']);
                    $templateProcessor->setValue("{$prefix}overall_sat_total", $totalSatData['total_responses']);
                    $templateProcessor->setValue("{$prefix}overall_sat_p", ($totalSatData['percentage'] ?? 0) . '%');
                }

                // Populate Tables 9 & 10
                $allSum5 = 0; $allSum4 = 0; $allSum3 = 0; $allSum2 = 0; $allSum1 = 0; $allSumNa = 0; $allTotal = 0;
                
                foreach ($sqdKeys as $sqd) {
                    $metrics = $data['sqd_metrics'][$scope][$sqd] ?? null;
                    if ($metrics) {
                        $templateProcessor->setValue("{$prefix}{$sqd}_5", $metrics['counts']['5']);
                        $templateProcessor->setValue("{$prefix}{$sqd}_4", $metrics['counts']['4']);
                        $templateProcessor->setValue("{$prefix}{$sqd}_3", $metrics['counts']['3']);
                        $templateProcessor->setValue("{$prefix}{$sqd}_2", $metrics['counts']['2']);
                        $templateProcessor->setValue("{$prefix}{$sqd}_1", $metrics['counts']['1']);
                        $templateProcessor->setValue("{$prefix}{$sqd}_na", $metrics['counts']['na']);
                        $templateProcessor->setValue("{$prefix}{$sqd}_total", $metrics['total_responses']);
                        $templateProcessor->setValue("{$prefix}{$sqd}_p", ($metrics['percentage'] ?? 0) . '%');

                        $allSum5 += $metrics['counts']['5']; $allSum4 += $metrics['counts']['4']; 
                        $allSum3 += $metrics['counts']['3']; $allSum2 += $metrics['counts']['2']; 
                        $allSum1 += $metrics['counts']['1']; $allSumNa += $metrics['counts']['na'];
                        $allTotal += $metrics['total_responses'];
                    }
                }
                
                $overallPct = $allTotal > 0 ? round((($allSum5 + $allSum4) / $allTotal) * 100, 2) : 0;
                
                $templateProcessor->setValue($scope === 'overall' ? 'sqd_all_5' : "{$prefix}all_5", $allSum5);
                $templateProcessor->setValue($scope === 'overall' ? 'sqd_all_4' : "{$prefix}all_4", $allSum4);
                $templateProcessor->setValue($scope === 'overall' ? 'sqd_all_3' : "{$prefix}all_3", $allSum3);
                $templateProcessor->setValue($scope === 'overall' ? 'sqd_all_2' : "{$prefix}all_2", $allSum2);
                $templateProcessor->setValue($scope === 'overall' ? 'sqd_all_1' : "{$prefix}all_1", $allSum1);
                $templateProcessor->setValue($scope === 'overall' ? 'sqd_all_na' : "{$prefix}all_na", $allSumNa);
                $templateProcessor->setValue($scope === 'overall' ? 'sqd_all_tot' : "{$prefix}all_tot", $allTotal);
                $templateProcessor->setValue($scope === 'overall' ? 'sqd_all_p' : "{$prefix}all_p", $overallPct . '%');
            }
        } else {
            // Standard Single-Department SQD Math mapping (Mean & Adjectival)
            $sqdKeys[] = 'overall_satisfaction';
            $totalMeanSum = 0; $validMeans = 0;
            
            foreach ($sqdKeys as $sqd) {
                if (isset($data['sqd_metrics'][$sqd])) {
                    $metrics = $data['sqd_metrics'][$sqd];
                    $templateProcessor->setValue("{$sqd}_1", $metrics['counts']['1']);
                    $templateProcessor->setValue("{$sqd}_1_p", ($metrics['percentages']['1'] ?? 0) . '%');
                    $templateProcessor->setValue("{$sqd}_2", $metrics['counts']['2']);
                    $templateProcessor->setValue("{$sqd}_2_p", ($metrics['percentages']['2'] ?? 0) . '%');
                    $templateProcessor->setValue("{$sqd}_3", $metrics['counts']['3']);
                    $templateProcessor->setValue("{$sqd}_3_p", ($metrics['percentages']['3'] ?? 0) . '%');
                    $templateProcessor->setValue("{$sqd}_4", $metrics['counts']['4']);
                    $templateProcessor->setValue("{$sqd}_4_p", ($metrics['percentages']['4'] ?? 0) . '%');
                    $templateProcessor->setValue("{$sqd}_5", $metrics['counts']['5']);
                    $templateProcessor->setValue("{$sqd}_5_p", ($metrics['percentages']['5'] ?? 0) . '%');
                    $templateProcessor->setValue("{$sqd}_na", $metrics['counts']['na']);
                    
                    $templateProcessor->setValue("{$sqd}_mean", $metrics['mean'] ?? '');
                    $templateProcessor->setValue("{$sqd}_adj", htmlspecialchars($metrics['adjectival'] ?? ''));

                    if (isset($metrics['mean']) && is_numeric($metrics['mean']) && $metrics['mean'] > 0) {
                        $totalMeanSum += (float) $metrics['mean'];
                        $validMeans++;
                    }
                }
            }

            $rawFinalMean = $validMeans > 0 ? round($totalMeanSum / $validMeans, 2) : 0;
            $templateProcessor->setValue('final_mean', $rawFinalMean > 0 ? number_format($rawFinalMean, 2) : '');

            $finalAdj = '';
            if ($rawFinalMean >= 4.21) $finalAdj = 'Excellent';
            elseif ($rawFinalMean >= 3.41) $finalAdj = 'Very Good';
            elseif ($rawFinalMean >= 2.61) $finalAdj = 'Good';
            elseif ($rawFinalMean >= 1.81) $finalAdj = 'Fair';
            elseif ($rawFinalMean > 0) $finalAdj = 'Needs Improvement';
            
            $templateProcessor->setValue('final_adj', $finalAdj);
        }

        // 8. Save populated temp DOCX inside storage/app/temp
        $workDir = storage_path('app/temp');
        File::ensureDirectoryExists($workDir);

        $tempDocx = $workDir . DIRECTORY_SEPARATOR . 'report_' . $report->id . '_' . uniqid() . '.docx';
        $templateProcessor->saveAs($tempDocx);

        return $tempDocx;
    }

    /**
     * Resolves the path to the LibreOffice binary across Windows and Linux production servers.
     */
   private function resolveLibreOfficeBinary(): ?string
    {
        $windowsPaths = [
            'C:\\Program Files\\LibreOffice\\program\\soffice.com',
            'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
            'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.com',
            'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
        ];

        foreach ($windowsPaths as $path) {
            if (file_exists($path)) {
                return $path;
            }
        }

        try {
            $linuxBinaries = ['soffice', 'libreoffice'];
            foreach ($linuxBinaries as $bin) {
                $process = new Process(['which', $bin]);
                $process->run();
                if ($process->isSuccessful()) {
                    return trim($process->getOutput());
                }
            }
        } catch (\Throwable $e) {
            return null;
        }

        return null;
    }
}