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

    public function generate(Request $request, \App\Services\ReportGenerationService $reportService)
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
        $validated['export_format'] = 'pdf';

        // SMART DUPLICATE HANDLING: Check if a report for this exact date range already exists
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
            // Block if it's already under committee review or finalized
            if (in_array($existingReport->status, ['Submitted', 'Approved'])) {
                return back()->with('error', 'A ' . strtoupper($validated['report_type']) . ' report for this date range has already been submitted to the committee.');
            }
            
            // If it's just a Draft or Returned, auto-delete the old one to make way for the fresh snapshot
            if (Schema::hasColumn('reports', 'deleted_at')) {
                $existingReport->deleted_at = now();
                $existingReport->save();
            } else {
                $existingReport->delete();
            }
        }

        // Use the official service to compute all SQD and CC math accurately
        $report = $reportService->generateLocalSnapshot($validated);

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

        // --- PRE-COMPILE DOCUMENTS ---
        try {
            $reportDir = storage_path('app/reports');
            \Illuminate\Support\Facades\File::ensureDirectoryExists($reportDir);

            // 1. Generate DOCX
            $tempDocx = $this->generateFilledDocx($report);
            if ($tempDocx) {
                $finalDocx = $reportDir . DIRECTORY_SEPARATOR . $report->id . '.docx';
                rename($tempDocx, $finalDocx);

                // 2. Generate PDF via LibreOffice
                $binary = $this->resolveLibreOfficeBinary();
                if ($binary) {
                    $outDirArg = str_replace('\\', '/', $reportDir);
                    $docPathArg = str_replace('\\', '/', $finalDocx);
                    
                    $env = [
                        'SystemRoot'  => getenv('SystemRoot') ?: 'C:\\Windows',
                        'TEMP'        => sys_get_temp_dir(),
                        'TMP'         => sys_get_temp_dir(),
                        'APPDATA'     => getenv('APPDATA') ?: sys_get_temp_dir(),
                        'LOCALAPPDATA'=> getenv('LOCALAPPDATA') ?: sys_get_temp_dir(),
                        'USERPROFILE' => getenv('USERPROFILE') ?: sys_get_temp_dir(),
                        'PATH'        => getenv('PATH') ?: '',
                    ];

                    $process = new \Symfony\Component\Process\Process([
                        $binary, '--headless', '--nologo', '--nofirststartwizard',
                        '--norestore', '--nolockcheck', '--convert-to', 'pdf',
                        '--outdir', $outDirArg, $docPathArg
                    ], null, $env);
                    $process->setTimeout(120);
                    $process->run();
                    
                    // Fallback to isolated profile if standard conversion failed
                    $generatedPdf = preg_replace('/\.docx$/i', '.pdf', $finalDocx);
                    if (!file_exists($generatedPdf) || filesize($generatedPdf) === 0) {
                        $loProfileDir = str_replace('\\', '/', sys_get_temp_dir()) . '/clsu_lo_profile';
                        \Illuminate\Support\Facades\File::ensureDirectoryExists($loProfileDir);
                        
                        $fallbackProcess = new \Symfony\Component\Process\Process([
                            $binary, '-env:UserInstallation=file:///' . ltrim($loProfileDir, '/'), 
                            '--headless', '--nologo', '--nofirststartwizard',
                            '--norestore', '--nolockcheck', '--convert-to', 'pdf',
                            '--outdir', $outDirArg, $docPathArg
                        ], null, $env);
                        $fallbackProcess->setTimeout(120);
                        $fallbackProcess->run();
                    }
                }
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error("Document pre-compile failed for Report {$report->id}: " . $e->getMessage());
        }

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

        // REAL-TIME TRIGGER: Instantly alert the Feedback Committee and update their dashboards with the fresh submission!
        event(new \App\Events\SystemDataUpdated('feedbackcommittee', $report->department_id));
        event(new \App\Events\SystemDataUpdated('superadmin', $report->department_id));

        return back()->with('success', 'Report successfully submitted to the Feedback Committee for review.');
    }

    public function recall($id)
    {
        $user = \Illuminate\Support\Facades\Auth::user();
        
        $report = Report::where('id', $id)
            ->where('department_id', $user->department_id) // Security check
            ->firstOrFail();

        // Only allow recall if the FC hasn't touched it yet
        if ($report->status !== 'Submitted') {
            return back()->with('error', 'You can only recall reports that are still pending committee review.');
        }

        $report->status = 'Draft';
        $report->save();

        \App\Models\AuditLog::logAction('Recalled', 'Local Reports', "Recalled report ID {$report->id} from the Feedback Committee.");

        // REAL-TIME TRIGGER: Instantly remove it from the FC's dashboard
        event(new \App\Events\SystemDataUpdated('feedbackcommittee', $report->department_id));
        event(new \App\Events\SystemDataUpdated('superadmin', $report->department_id));

        return back()->with('success', 'Report successfully recalled and reverted to a Draft.');
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

    /**
     * Shared logic: Populates the Word template and returns the temporary .docx file path.
     */
    private function generateFilledDocx(Report $report): ?string
    {
        $data = $report->report_data;
        $departmentName = $data['metadata']['department'] ?? '';

        if ($report->report_type === 'cc') {
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

        // Basic Metadata
        $templateProcessor->setValue('department', htmlspecialchars($data['metadata']['department']));
        $templateProcessor->setValue('period', htmlspecialchars($data['metadata']['period']));
        $templateProcessor->setValue('total_respondents', $data['metadata']['total_respondents']);

        // CC Math (Tables 5)
        if ($report->report_type === 'cc') {
            // Provide empty fallback strings if cc_metrics mapping isn't fully implemented in FP view yet
            for ($i = 1; $i <= 4; $i++) { $templateProcessor->setValue("cc1_{$i}_c", ''); $templateProcessor->setValue("cc1_{$i}_p", ''); }
            for ($i = 1; $i <= 5; $i++) { $templateProcessor->setValue("cc2_{$i}_c", ''); $templateProcessor->setValue("cc2_{$i}_p", ''); }
            for ($i = 1; $i <= 4; $i++) { $templateProcessor->setValue("cc3_{$i}_c", ''); $templateProcessor->setValue("cc3_{$i}_p", ''); }
        }

        // SQD Matrix Processing
        $sqdKeys = ['sqd0', 'sqd1', 'sqd2', 'sqd3', 'sqd4', 'sqd5', 'sqd6', 'sqd7', 'sqd8', 'overall_satisfaction'];
        $dataSource = (isset($data['sqd_metrics']['overall'])) ? $data['sqd_metrics']['overall'] : $data['sqd_metrics'];
        
        $totalMeanSum = 0; $validMeans = 0;
        foreach ($sqdKeys as $sqd) {
            if (isset($dataSource[$sqd])) {
                $metrics = $dataSource[$sqd];
                for ($x = 1; $x <= 5; $x++) {
                    $templateProcessor->setValue("{$sqd}_{$x}", $metrics['counts'][$x] ?? 0);
                    $templateProcessor->setValue("{$sqd}_{$x}_p", ($metrics['percentages'][$x] ?? 0) . '%');
                }
                $templateProcessor->setValue("{$sqd}_na", $metrics['counts']['na'] ?? 0);
                $templateProcessor->setValue("{$sqd}_mean", $metrics['mean'] ?? '');
                $templateProcessor->setValue("{$sqd}_adj", htmlspecialchars($metrics['adjectival'] ?? ''));

                if (isset($metrics['mean']) && is_numeric($metrics['mean']) && $metrics['mean'] > 0) {
                    $totalMeanSum += (float) $metrics['mean'];
                    $validMeans++;
                }
            } else {
                for ($x=1; $x<=5; $x++) { $templateProcessor->setValue("{$sqd}_{$x}", '0'); $templateProcessor->setValue("{$sqd}_{$x}_p", '0%'); }
                $templateProcessor->setValue("{$sqd}_na", '0'); $templateProcessor->setValue("{$sqd}_mean", ''); $templateProcessor->setValue("{$sqd}_adj", '');
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
        
        $templateProcessor->setValue('rec_y', $data['recommendations']['Yes']['count'] ?? 0);
        $templateProcessor->setValue('rec_y_p', ($data['recommendations']['Yes']['percent'] ?? 0) . '%');
        $templateProcessor->setValue('rec_n', $data['recommendations']['No']['count'] ?? 0);
        $templateProcessor->setValue('rec_n_p', ($data['recommendations']['No']['percent'] ?? 0) . '%');
        
        $templateProcessor->setValue('har_y', $data['harassment']['Yes']['count'] ?? 0);
        $templateProcessor->setValue('har_y_p', ($data['harassment']['Yes']['percent'] ?? 0) . '%');
        $templateProcessor->setValue('har_n', $data['harassment']['No']['count'] ?? 0);
        $templateProcessor->setValue('har_n_p', ($data['harassment']['No']['percent'] ?? 0) . '%');

        $hDetails = implode(', ', $data['harassment_details'] ?? []);
        $templateProcessor->setValue('harassment_details', empty($hDetails) ? 'None' : htmlspecialchars($hDetails));

        $comments = implode(', ', $data['comments'] ?? []);
        $templateProcessor->setValue('comments', empty($comments) ? 'None' : htmlspecialchars($comments));

        $workDir = storage_path('app/temp');
        \Illuminate\Support\Facades\File::ensureDirectoryExists($workDir);
        $tempDocx = $workDir . DIRECTORY_SEPARATOR . 'report_' . $report->id . '_' . uniqid() . '.docx';
        $templateProcessor->saveAs($tempDocx);

        return $tempDocx;
    }

    /**
     * Resolves the path to the LibreOffice binary across Windows and Linux.
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
                $process = new \Symfony\Component\Process\Process(['which', $bin]);
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