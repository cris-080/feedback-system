<?php

namespace App\Services;

use App\Models\Report;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\File;

class DocumentGenerationService
{
    public function compileDocuments(Report $report): string
    {
        return $this->generatePdf($report);
    }

    public function generatePdf(Report $report): string
    {
        $reportDir = storage_path('app/reports');
        File::ensureDirectoryExists($reportDir);

        $viewName = $this->resolveViewName($report);
        $viewData = $this->buildViewData($report);

        $pdf = Pdf::loadView($viewName, $viewData)
            ->setPaper('a4', 'portrait');

        $pdfPath = $reportDir . DIRECTORY_SEPARATOR . $report->id . '.pdf';
        $pdf->save($pdfPath);

        return $pdfPath;
    }

    private function isUniversityWide(Report $report): bool
    {
        $departmentName = $report->report_data['metadata']['department'] ?? '';

        return str_contains(strtolower($departmentName), 'university-wide')
            || str_contains(strtolower($departmentName), 'all departments')
            || $report->department_id === null;
    }

    private function resolveViewName(Report $report): string
    {
        $isUniversityWide = $this->isUniversityWide($report);
        $isCC = $report->report_type === 'cc';

        if ($isUniversityWide) {
            return $isCC ? 'reports.pdf.cc_overall' : 'reports.pdf.non_cc_overall';
        }

        return $isCC ? 'reports.pdf.cc' : 'reports.pdf.non_cc';
    }

    private function buildViewData(Report $report): array
    {
        $data = is_array($report->report_data) ? $report->report_data : [];
        $isUniversityWide = $this->isUniversityWide($report);
        $isCC = $report->report_type === 'cc';

        $viewData = [
            'logoDataUri'       => $this->resolveLogoDataUri(),
            'department'        => $data['metadata']['department'] ?? '',
            'period'            => $data['metadata']['period'] ?? '',
            'total_respondents' => $data['metadata']['total_respondents'] ?? 0,
            'docControlCode'    => $isUniversityWide
                ? 'OUP.XXX.YYY.F.018 (Revision No. 0; May 7, 2026)'
                : 'OUP.XXX.YYY.F.057 (Revision No. 0; May 11, 2026)',
            'watermarkText'     => $isCC ? "CITIZEN'S CHARTER" : null,
            'scopedSqd'         => [],
            'sqd'               => [],

            // Client Type & Sex Demographics
            'ct_cit'   => $data['demographics']['client_type']['Citizen']['count'] ?? 0,
            'ct_cit_p' => ($data['demographics']['client_type']['Citizen']['percent'] ?? 0) . '%',
            'ct_bus'   => $data['demographics']['client_type']['Business']['count'] ?? 0,
            'ct_bus_p' => ($data['demographics']['client_type']['Business']['percent'] ?? 0) . '%',
            'ct_gov'   => $data['demographics']['client_type']['Government']['count'] ?? 0,
            'ct_gov_p' => ($data['demographics']['client_type']['Government']['percent'] ?? 0) . '%',

            'sex_m'    => $data['demographics']['sex']['Male']['count'] ?? 0,
            'sex_m_p'  => ($data['demographics']['sex']['Male']['percent'] ?? 0) . '%',
            'sex_f'    => $data['demographics']['sex']['Female']['count'] ?? 0,
            'sex_f_p'  => ($data['demographics']['sex']['Female']['percent'] ?? 0) . '%',
            'sex_na'   => $data['demographics']['sex']['Prefer not to say']['count'] ?? 0,
            'sex_na_p' => ($data['demographics']['sex']['Prefer not to say']['percent'] ?? 0) . '%',
        ];

        // Regions
        $regions = [];
        foreach ($data['demographics']['region'] ?? [] as $name => $metrics) {
            if (($metrics['count'] ?? 0) > 0) {
                $regions[] = [
                    'name' => $name,
                    'freq' => $metrics['count'],
                    'pct'  => ($metrics['percent'] ?? 0) . '%',
                ];
            }
        }
        $viewData['regions'] = $regions;

        // Services (Local Templates)
        $services = [];
        foreach ($data['demographics']['services'] ?? [] as $name => $metrics) {
            if (($metrics['count'] ?? 0) > 0) {
                $services[] = [
                    'name' => $name,
                    'freq' => $metrics['count'],
                    'pct'  => ($metrics['percent'] ?? 0) . '%',
                ];
            }
        }
        $viewData['services'] = $services;

        // University-Wide CC Tables 1-3
        $viewData['cc_awareness_pct']   = ($data['cc_formulas']['cc1_aware'] ?? 0) . '%';
        $viewData['cc_visibility_pct']  = ($data['cc_formulas']['cc2_visible'] ?? 0) . '%';
        $viewData['cc_helpfulness_pct'] = ($data['cc_formulas']['cc3_helpful'] ?? 0) . '%';
        $viewData['response_rate_pct']  = '100%';
        $viewData['overall_score_pct']  = ($data['cc_formulas']['overall'] ?? 0) . '%';

        $extServices = [];
        $intServices = [];
        $zeroServices = [];
        $extTotalResponses = 0;
        $extTotalTrans = 0;
        $intTotalResponses = 0;
        $intTotalTrans = 0;

        if (isset($data['table2_data']) && is_array($data['table2_data'])) {
            foreach (['external', 'internal'] as $scope) {
                foreach ($data['table2_data'][$scope] ?? [] as $deptName => $deptServices) {
                    foreach ($deptServices as $svcName => $count) {
                        $combinedName = $deptName . ' - ' . $svcName;
                        if ($count > 0) {
                            if ($scope === 'external') {
                                $extServices[] = ['name' => $combinedName, 'responses' => $count, 'transactions' => $count];
                                $extTotalResponses += $count;
                                $extTotalTrans += $count;
                            } else {
                                $intServices[] = ['name' => $combinedName, 'responses' => $count, 'transactions' => $count];
                                $intTotalResponses += $count;
                                $intTotalTrans += $count;
                            }
                        } else {
                            $zeroServices[] = $combinedName;
                        }
                    }
                }
            }
        }

        $viewData['ext_services']           = $extServices;
        $viewData['int_services']           = $intServices;
        $viewData['zero_services']          = $zeroServices;
        $viewData['ext_total_responses']    = $extTotalResponses;
        $viewData['ext_total_transactions'] = $extTotalTrans;
        $viewData['int_total_responses']    = $intTotalResponses;
        $viewData['int_total_transactions'] = $intTotalTrans;
        $viewData['total_responses']        = $extTotalResponses + $intTotalResponses;
        $viewData['total_transactions']     = $extTotalTrans + $intTotalTrans;

        // CC1-CC3 Breakdown
        $viewData['cc'] = $isCC ? $this->resolveCCMetrics($data) : [];

        // SQD Matrix
        $sqdKeys = ['sqd0', 'sqd1', 'sqd2', 'sqd3', 'sqd4', 'sqd5', 'sqd6', 'sqd7', 'sqd8'];

        if ($isUniversityWide && $isCC && isset($data['sqd_metrics']['overall'])) {
            $scopedSqd = [];

            foreach (['overall', 'internal', 'external'] as $scope) {
                $scopeData = $data['sqd_metrics'][$scope] ?? [];
                $overallSat = $scopeData['overall_satisfaction'] ?? null;

                $scopedSqd[$scope]['overall_satisfaction'] = [
                    '5'     => $overallSat['counts']['5'] ?? 0,
                    '4'     => $overallSat['counts']['4'] ?? 0,
                    '3'     => $overallSat['counts']['3'] ?? 0,
                    '2'     => $overallSat['counts']['2'] ?? 0,
                    '1'     => $overallSat['counts']['1'] ?? 0,
                    'na'    => $overallSat['counts']['na'] ?? 0,
                    'total' => $overallSat['total_responses'] ?? 0,
                    'p'     => ($overallSat['percentage'] ?? 0) . '%',
                ];

                $sum5 = 0; $sum4 = 0; $sum3 = 0; $sum2 = 0; $sum1 = 0; $sumNa = 0; $sumTotal = 0;

                foreach ($sqdKeys as $sqd) {
                    $m = $scopeData[$sqd] ?? null;
                    $c5 = $m['counts']['5'] ?? 0;
                    $c4 = $m['counts']['4'] ?? 0;
                    $c3 = $m['counts']['3'] ?? 0;
                    $c2 = $m['counts']['2'] ?? 0;
                    $c1 = $m['counts']['1'] ?? 0;
                    $cNa = $m['counts']['na'] ?? 0;
                    $tot = $m['total_responses'] ?? 0;

                    $scopedSqd[$scope]['items'][$sqd] = [
                        '5'     => $c5,
                        '4'     => $c4,
                        '3'     => $c3,
                        '2'     => $c2,
                        '1'     => $c1,
                        'na'    => $cNa,
                        'total' => $tot,
                        'p'     => ($m['percentage'] ?? 0) . '%',
                    ];

                    $sum5 += $c5;
                    $sum4 += $c4;
                    $sum3 += $c3;
                    $sum2 += $c2;
                    $sum1 += $c1;
                    $sumNa += $cNa;
                    $sumTotal += $tot;
                }

                $overallPct = $sumTotal > 0 ? round((($sum5 + $sum4) / $sumTotal) * 100, 2) : 0;

                $scopedSqd[$scope]['totals'] = [
                    '5'     => $sum5,
                    '4'     => $sum4,
                    '3'     => $sum3,
                    '2'     => $sum2,
                    '1'     => $sum1,
                    'na'    => $sumNa,
                    'total' => $sumTotal,
                    'p'     => $overallPct . '%',
                ];
            }

            $viewData['scopedSqd'] = $scopedSqd;
        } else {
            $sqdKeys[] = 'overall_satisfaction';
            $totalMeanSum = 0;
            $validMeans = 0;
            $dataSource = $data['sqd_metrics']['overall'] ?? ($data['sqd_metrics'] ?? []);
            $sqdRows = [];

            foreach ($sqdKeys as $sqd) {
                $m = $dataSource[$sqd] ?? null;

                $sqdRows[$sqd] = [
                    '1'    => $m['counts']['1'] ?? 0,
                    '1_p'  => ($m['percentages']['1'] ?? 0) . '%',
                    '2'    => $m['counts']['2'] ?? 0,
                    '2_p'  => ($m['percentages']['2'] ?? 0) . '%',
                    '3'    => $m['counts']['3'] ?? 0,
                    '3_p'  => ($m['percentages']['3'] ?? 0) . '%',
                    '4'    => $m['counts']['4'] ?? 0,
                    '4_p'  => ($m['percentages']['4'] ?? 0) . '%',
                    '5'    => $m['counts']['5'] ?? 0,
                    '5_p'  => ($m['percentages']['5'] ?? 0) . '%',
                    'na'   => $m['counts']['na'] ?? 0,
                    'mean' => $m['mean'] ?? '',
                    'adj'  => $m['adjectival'] ?? '',
                ];

                if (isset($m['mean']) && is_numeric($m['mean']) && $m['mean'] > 0) {
                    $totalMeanSum += (float) $m['mean'];
                    $validMeans++;
                }
            }

            $rawFinalMean = $validMeans > 0 ? round($totalMeanSum / $validMeans, 2) : 0;

            $finalAdj = '';
            if ($rawFinalMean >= 4.21) {
                $finalAdj = 'Excellent';
            } elseif ($rawFinalMean >= 3.41) {
                $finalAdj = 'Very Good';
            } elseif ($rawFinalMean >= 2.61) {
                $finalAdj = 'Good';
            } elseif ($rawFinalMean >= 1.81) {
                $finalAdj = 'Fair';
            } elseif ($rawFinalMean > 0) {
                $finalAdj = 'Needs Improvement';
            }

            $viewData['sqd']                = $sqdRows;
            $viewData['final_mean']         = $rawFinalMean > 0 ? number_format($rawFinalMean, 2) : '';
            $viewData['final_adj']          = $finalAdj;
            $viewData['rec_y']              = $data['recommendations']['Yes']['count'] ?? 0;
            $viewData['rec_y_p']            = ($data['recommendations']['Yes']['percent'] ?? 0) . '%';
            $viewData['rec_n']              = $data['recommendations']['No']['count'] ?? 0;
            $viewData['rec_n_p']            = ($data['recommendations']['No']['percent'] ?? 0) . '%';
            $viewData['har_y']              = $data['harassment']['Yes']['count'] ?? 0;
            $viewData['har_y_p']            = ($data['harassment']['Yes']['percent'] ?? 0) . '%';
            $viewData['har_n']              = $data['harassment']['No']['count'] ?? 0;
            $viewData['har_n_p']            = ($data['harassment']['No']['percent'] ?? 0) . '%';
            $hDetails                       = implode(', ', $data['harassment_details'] ?? []);
            $viewData['harassment_details'] = $hDetails !== '' ? $hDetails : 'None';
            $comments                       = implode(', ', $data['comments'] ?? []);
            $viewData['comments']           = $comments !== '' ? $comments : 'None';
        }

        return $viewData;
    }

   private function resolveLogoDataUri(): ?string
    {
        $candidates = [
            public_path('images/CLSU-header.png'),
            public_path('images/clsu-header.png'),
            public_path('images/clsu-seal-logotype.png'),
            public_path('images/CLSU Seal and Logotype.png'),
            public_path('images/clsu-logo.png'),
            public_path('images/clsu_logo.png'),
            public_path('images/clsu-seal.png'),
            public_path('images/logo.png'),
        ];

        foreach ($candidates as $path) {
            if (file_exists($path)) {
                $mime = mime_content_type($path) ?: 'image/png';
                return 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($path));
            }
        }

        return null;
    }

    private function resolveCCMetrics(array $data): array
    {
        $ccData = [
            'cc1_1' => ['c' => '', 'p' => ''], 'cc1_2' => ['c' => '', 'p' => ''],
            'cc1_3' => ['c' => '', 'p' => ''], 'cc1_4' => ['c' => '', 'p' => ''],
            'cc2_1' => ['c' => '', 'p' => ''], 'cc2_2' => ['c' => '', 'p' => ''],
            'cc2_3' => ['c' => '', 'p' => ''], 'cc2_4' => ['c' => '', 'p' => ''],
            'cc2_5' => ['c' => '', 'p' => ''],
            'cc3_1' => ['c' => '', 'p' => ''], 'cc3_2' => ['c' => '', 'p' => ''],
            'cc3_3' => ['c' => '', 'p' => ''], 'cc3_4' => ['c' => '', 'p' => ''],
        ];

        $rawCounts = ['cc1_1' => 0, 'cc1_2' => 0, 'cc1_3' => 0, 'cc1_4' => 0];

        foreach (['cc1', 'cc2', 'cc3'] as $ccKey) {
            if (!isset($data['cc_metrics'][$ccKey])) {
                continue;
            }
            foreach ($data['cc_metrics'][$ccKey] as $dbLabel => $metrics) {
                $c = $metrics['count'] ?? 0;
                $p = $metrics['percent'] ?? 0;
                if ($c <= 0) {
                    continue;
                }

                $labelLower = strtolower(trim($dbLabel));
                if ($ccKey === 'cc1') {
                    if (str_contains($labelLower, 'do not know') || str_contains($labelLower, 'not know') || str_contains($labelLower, 'did not see one') || str_starts_with($labelLower, '4')) {
                        $ccData['cc1_4'] = ['c' => $c, 'p' => $p . '%'];
                        $rawCounts['cc1_4'] = $c;
                    } elseif (str_contains($labelLower, 'learned') || str_starts_with($labelLower, '3')) {
                        $ccData['cc1_3'] = ['c' => $c, 'p' => $p . '%'];
                        $rawCounts['cc1_3'] = $c;
                    } elseif (str_contains($labelLower, 'did not see') || str_contains($labelLower, 'but') || str_starts_with($labelLower, '2')) {
                        $ccData['cc1_2'] = ['c' => $c, 'p' => $p . '%'];
                        $rawCounts['cc1_2'] = $c;
                    } elseif (str_contains($labelLower, 'saw') || str_starts_with($labelLower, '1')) {
                        $ccData['cc1_1'] = ['c' => $c, 'p' => $p . '%'];
                        $rawCounts['cc1_1'] = $c;
                    }
                } elseif ($ccKey === 'cc2') {
                    if (str_contains($labelLower, 'somewhat') || str_starts_with($labelLower, '2')) {
                        $ccData['cc2_2'] = ['c' => $c, 'p' => $p . '%'];
                    } elseif (str_contains($labelLower, 'difficult') || str_starts_with($labelLower, '3')) {
                        $ccData['cc2_3'] = ['c' => $c, 'p' => $p . '%'];
                    } elseif (str_contains($labelLower, 'not visible') || str_starts_with($labelLower, '4')) {
                        $ccData['cc2_4'] = ['c' => $c, 'p' => $p . '%'];
                    } elseif (str_contains($labelLower, 'easy') || str_starts_with($labelLower, '1')) {
                        $ccData['cc2_1'] = ['c' => $c, 'p' => $p . '%'];
                    }
                } elseif ($ccKey === 'cc3') {
                    if (str_contains($labelLower, 'very much') || str_starts_with($labelLower, '1')) {
                        $ccData['cc3_1'] = ['c' => $c, 'p' => $p . '%'];
                    } elseif (str_contains($labelLower, 'somewhat') || str_starts_with($labelLower, '2')) {
                        $ccData['cc3_2'] = ['c' => $c, 'p' => $p . '%'];
                    } elseif (str_contains($labelLower, 'did not help') || str_starts_with($labelLower, '3')) {
                        $ccData['cc3_3'] = ['c' => $c, 'p' => $p . '%'];
                    }
                }
            }
        }

        $totalCC1 = $rawCounts['cc1_1'] + $rawCounts['cc1_2'] + $rawCounts['cc1_3'] + $rawCounts['cc1_4'];
        if ($totalCC1 === 0 && isset($data['cc_metrics']['cc3']['N/A']) && ($data['cc_metrics']['cc3']['N/A']['count'] ?? 0) > 0) {
            $ccData['cc1_4'] = [
                'c' => $data['cc_metrics']['cc3']['N/A']['count'],
                'p' => ($data['cc_metrics']['cc3']['N/A']['percent'] ?? 0) . '%',
            ];
        }

        return $ccData;
    }
}