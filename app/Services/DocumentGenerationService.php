<?php

namespace App\Services;

use App\Models\Report;
use Illuminate\Support\Facades\File;
use Symfony\Component\Process\Process;

class DocumentGenerationService
{
    public function compileDocuments(Report $report)
    {
        $reportDir = storage_path('app/reports');
        File::ensureDirectoryExists($reportDir);

        $tempDocx = $this->generateFilledDocx($report);
        
        if ($tempDocx) {
            $finalDocx = $reportDir . DIRECTORY_SEPARATOR . $report->id . '.docx';
            rename($tempDocx, $finalDocx);

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

                $process = new Process([
                    $binary, '--headless', '--nologo', '--nofirststartwizard',
                    '--norestore', '--nolockcheck', '--convert-to', 'pdf',
                    '--outdir', $outDirArg, $docPathArg
                ], null, $env);
                
                $process->setTimeout(120);
                $process->run();
                
                $generatedPdf = preg_replace('/\.docx$/i', '.pdf', $finalDocx);
                if (!file_exists($generatedPdf) || filesize($generatedPdf) === 0) {
                    $loProfileDir = str_replace('\\', '/', sys_get_temp_dir()) . '/clsu_lo_profile';
                    File::ensureDirectoryExists($loProfileDir);
                    
                    $fallbackProcess = new Process([
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
    }

    public function generateFilledDocx(Report $report): ?string
    {
        $data = $report->report_data;
        $departmentName = $data['metadata']['department'] ?? '';
        
        $isUniversityWide = str_contains(strtolower($departmentName), 'university-wide') || 
                            str_contains(strtolower($departmentName), 'all departments') ||
                            $report->department_id === null;
                            
        if ($isUniversityWide) { 
            if ($report->report_type === 'cc') {
                $templatePath = storage_path('app/templates/cc_overall_template.docx');
            } else {
                $hyphenPath = storage_path('app/templates/non-cc_overall_template.docx');
                $underscorePath = storage_path('app/templates/non_cc_overall_template.docx');
                $templatePath = file_exists($hyphenPath) ? $hyphenPath : $underscorePath;
            }
        } else {
            if ($report->report_type === 'cc') {
                $templatePath = storage_path('app/templates/cc_template.docx');
            } else {
                $hyphenPath = storage_path('app/templates/non-cc_template.docx');
                $underscorePath = storage_path('app/templates/non_cc_template.docx');
                $templatePath = file_exists($hyphenPath) ? $hyphenPath : $underscorePath;
            }
        }

        if (!file_exists($templatePath)) {
            return null;
        }

        $templateProcessor = new \PhpOffice\PhpWord\TemplateProcessor($templatePath);

        // 1. Basic Metadata & Demographics
        $templateProcessor->setValue('department', htmlspecialchars($data['metadata']['department']));
        $templateProcessor->setValue('period', htmlspecialchars($data['metadata']['period']));
        $templateProcessor->setValue('total_respondents', $data['metadata']['total_respondents']);

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

        // 2. Dynamic Region & Structure Blocks
        if ($isUniversityWide) {
            $regions = [];
            foreach ($data['demographics']['region'] ?? [] as $name => $metrics) {
                if ($metrics['count'] > 0) {
                    $regions[] = ['region_name' => htmlspecialchars($name), 'region_freq' => $metrics['count'], 'region_pct'  => $metrics['percent'] . '%'];
                }
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

            if (isset($data['table2_data'])) {
                $templateProcessor->setValue('cc_awareness_pct', ($data['cc_formulas']['cc1_aware'] ?? 0) . '%');
                $templateProcessor->setValue('cc_visibility_pct', ($data['cc_formulas']['cc2_visible'] ?? 0) . '%');
                $templateProcessor->setValue('cc_helpfulness_pct', ($data['cc_formulas']['cc3_helpful'] ?? 0) . '%');
                $templateProcessor->setValue('response_rate_pct', '100%'); 
                $templateProcessor->setValue('overall_score_pct', ($data['cc_formulas']['overall'] ?? 0) . '%');

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
                                    $extServicesArr[] = $combinedName; $extRespArr[] = $count; $extTransArr[] = $count;
                                    $extTotalResponses += $count; $extTotalTrans += $count; 
                                }
                                if ($scope === 'internal') { 
                                    $intServicesArr[] = $combinedName; $intRespArr[] = $count; $intTransArr[] = $count;
                                    $intTotalResponses += $count; $intTotalTrans += $count; 
                                }
                            } else {
                                $zeroServicesArr[] = $combinedName;
                            }
                        }
                    }
                }

                $templateProcessor->setValue('ext_total_responses', $extTotalResponses);
                $templateProcessor->setValue('ext_total_transactions', $extTotalTrans);
                $templateProcessor->setValue('int_total_responses', $intTotalResponses);
                $templateProcessor->setValue('int_total_transactions', $intTotalTrans);
                $templateProcessor->setValue('total_responses', $extTotalResponses + $intTotalResponses);
                $templateProcessor->setValue('total_transactions', $extTotalTrans + $intTotalTrans);

                $lb = '</w:t><w:br/><w:t>';
                $templateProcessor->setValue('ext_services_list', empty($extServicesArr) ? 'None' : implode($lb, $extServicesArr));
                $templateProcessor->setValue('ext_resp_list', empty($extRespArr) ? '0' : implode($lb, $extRespArr));
                $templateProcessor->setValue('ext_trans_list', empty($extTransArr) ? '0' : implode($lb, $extTransArr));
                $templateProcessor->setValue('int_services_list', empty($intServicesArr) ? 'None' : implode($lb, $intServicesArr));
                $templateProcessor->setValue('int_resp_list', empty($intRespArr) ? '0' : implode($lb, $intRespArr));
                $templateProcessor->setValue('int_trans_list', empty($intTransArr) ? '0' : implode($lb, $intTransArr));
                $templateProcessor->setValue('zero_services_list', empty($zeroServicesArr) ? 'None' : implode($lb, $zeroServicesArr));
            }
        } else {
            $regions = [];
            foreach ($data['demographics']['region'] ?? [] as $name => $metrics) {
                if ($metrics['count'] > 0) {
                    $regions[] = ['block_regions' => '', '/block_regions' => '', 'region_name' => htmlspecialchars($name), 'region_freq' => $metrics['count'], 'region_pct' => $metrics['percent'] . '%'];
                }
            }
            if (empty($regions)) { $regions[] = ['block_regions' => '', '/block_regions' => '', 'region_name' => 'None', 'region_freq' => '0', 'region_pct' => '0%']; }
            try { 
                $templateProcessor->cloneRowAndSetValues('region_name', $regions); 
                $templateProcessor->setValue('block_regions', ''); $templateProcessor->setValue('/block_regions', '');
            } catch (\Exception $e) {}

            $services = [];
            foreach ($data['demographics']['services'] ?? [] as $name => $metrics) {
                if ($metrics['count'] > 0) {
                    $services[] = ['block_services' => '', '/block_services' => '', 'service_name' => htmlspecialchars($name), 'service_freq' => $metrics['count'], 'service_pct' => $metrics['percent'] . '%'];
                }
            }
            if (empty($services)) { $services[] = ['block_services' => '', '/block_services' => '', 'service_name' => 'None', 'service_freq' => '0', 'service_pct' => '0%']; }
            try { 
                $templateProcessor->cloneRowAndSetValues('service_name', $services); 
                $templateProcessor->setValue('block_services', ''); $templateProcessor->setValue('/block_services', '');
            } catch (\Exception $e) {}
        }

        // 3. CC Math
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

        // 4. SQD Matrix Processing
        $sqdKeys = ['sqd0', 'sqd1', 'sqd2', 'sqd3', 'sqd4', 'sqd5', 'sqd6', 'sqd7', 'sqd8'];
        if ($isUniversityWide && $report->report_type === 'cc' && isset($data['sqd_metrics']['overall'])) {
            foreach (['overall' => '', 'internal' => 'int_', 'external' => 'ext_'] as $scope => $prefix) {
                $totalSatData = $data['sqd_metrics'][$scope]['overall_satisfaction'] ?? null;
                if ($totalSatData) {
                    $templateProcessor->setValue("{$prefix}overall_sat_5", $totalSatData['counts']['5']);
                    $templateProcessor->setValue("{$prefix}overall_sat_4", $totalSatData['counts']['4']);
                    $templateProcessor->setValue("{$prefix}overall_sat_3", $totalSatData['counts']['3']);
                    $templateProcessor->setValue("{$prefix}overall_sat_2", $totalSatData['counts']['2']);
                    $templateProcessor->setValue("{$prefix}overall_sat_1", $totalSatData['counts']['1']);
                    $templateProcessor->setValue("{$prefix}overall_sat_na", $totalSatData['counts']['na']);
                    $templateProcessor->setValue("{$prefix}overall_sat_total", $totalSatData['total_responses']);
                    $templateProcessor->setValue("{$prefix}overall_sat_p", ($totalSatData['percentage'] ?? 0) . '%');
                }

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
                        $allSum1 += $metrics['counts']['1']; $allSumNa += $metrics['counts']['na']; $allTotal += $metrics['total_responses'];
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
            $sqdKeys[] = 'overall_satisfaction';
            $totalMeanSum = 0; $validMeans = 0;
            $dataSource = (isset($data['sqd_metrics']['overall'])) ? $data['sqd_metrics']['overall'] : $data['sqd_metrics'];
            
            foreach ($sqdKeys as $sqd) {
                if (isset($dataSource[$sqd])) {
                    $metrics = $dataSource[$sqd];
                    $templateProcessor->setValue("{$sqd}_1", $metrics['counts']['1'] ?? 0);
                    $templateProcessor->setValue("{$sqd}_1_p", ($metrics['percentages']['1'] ?? 0) . '%');
                    $templateProcessor->setValue("{$sqd}_2", $metrics['counts']['2'] ?? 0);
                    $templateProcessor->setValue("{$sqd}_2_p", ($metrics['percentages']['2'] ?? 0) . '%');
                    $templateProcessor->setValue("{$sqd}_3", $metrics['counts']['3'] ?? 0);
                    $templateProcessor->setValue("{$sqd}_3_p", ($metrics['percentages']['3'] ?? 0) . '%');
                    $templateProcessor->setValue("{$sqd}_4", $metrics['counts']['4'] ?? 0);
                    $templateProcessor->setValue("{$sqd}_4_p", ($metrics['percentages']['4'] ?? 0) . '%');
                    $templateProcessor->setValue("{$sqd}_5", $metrics['counts']['5'] ?? 0);
                    $templateProcessor->setValue("{$sqd}_5_p", ($metrics['percentages']['5'] ?? 0) . '%');
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
            $templateProcessor->setValue('overall_satisfaction_na', $dataSource['overall_satisfaction']['counts']['na'] ?? 0);
        }

        $workDir = storage_path('app/temp');
        File::ensureDirectoryExists($workDir);
        $tempDocx = $workDir . DIRECTORY_SEPARATOR . 'report_' . $report->id . '_' . uniqid() . '.docx';
        $templateProcessor->saveAs($tempDocx);

        return $tempDocx;
    }

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
                    if (str_contains($labelLower, 'do not know') || str_contains($labelLower, 'not know') || str_contains($labelLower, 'did not see one') || str_starts_with($labelLower, '4')) $ccData['cc1_4'] = ['c' => $c, 'p' => $p];
                    elseif (str_contains($labelLower, 'learned') || str_starts_with($labelLower, '3')) $ccData['cc1_3'] = ['c' => $c, 'p' => $p];
                    elseif (str_contains($labelLower, 'did not see') || str_contains($labelLower, 'but') || str_starts_with($labelLower, '2')) $ccData['cc1_2'] = ['c' => $c, 'p' => $p];
                    elseif (str_contains($labelLower, 'saw') || str_starts_with($labelLower, '1')) $ccData['cc1_1'] = ['c' => $c, 'p' => $p];
                } elseif ($ccKey === 'cc2') {
                    if (str_contains($labelLower, 'somewhat') || str_starts_with($labelLower, '2')) $ccData['cc2_2'] = ['c' => $c, 'p' => $p];
                    elseif (str_contains($labelLower, 'difficult') || str_starts_with($labelLower, '3')) $ccData['cc2_3'] = ['c' => $c, 'p' => $p];
                    elseif (str_contains($labelLower, 'not visible') || str_starts_with($labelLower, '4')) $ccData['cc2_4'] = ['c' => $c, 'p' => $p];
                    elseif (str_contains($labelLower, 'easy') || str_starts_with($labelLower, '1')) $ccData['cc2_1'] = ['c' => $c, 'p' => $p];
                } elseif ($ccKey === 'cc3') {
                    if (str_contains($labelLower, 'very much') || str_starts_with($labelLower, '1')) $ccData['cc3_1'] = ['c' => $c, 'p' => $p];
                    elseif (str_contains($labelLower, 'somewhat') || str_starts_with($labelLower, '2')) $ccData['cc3_2'] = ['c' => $c, 'p' => $p];
                    elseif (str_contains($labelLower, 'did not help') || str_starts_with($labelLower, '3')) $ccData['cc3_3'] = ['c' => $c, 'p' => $p];
                }
            }
        }
        $totalCC1 = $ccData['cc1_1']['c'] + $ccData['cc1_2']['c'] + $ccData['cc1_3']['c'] + $ccData['cc1_4']['c'];
        if ($totalCC1 === 0 && isset($data['cc_metrics']['cc3']['N/A']) && ($data['cc_metrics']['cc3']['N/A']['count'] ?? 0) > 0) {
            $ccData['cc1_4'] = ['c' => $data['cc_metrics']['cc3']['N/A']['count'], 'p' => $data['cc_metrics']['cc3']['N/A']['percent']];
        }
        return $ccData;
    }
}