<?php

namespace App\Services;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use App\Models\Report;
use App\Models\Department;

class ReportGenerationService
{
    /**
     * Generates a University-Wide summary for the Feedback Committee.
     */
    public function generateGlobalSnapshot(array $validated): ?Report
    {
        $targetId = $validated['department_id'];
        
        $query = DB::table('feedback')
            ->join('forms', 'feedback.form_id', '=', 'forms.form_id')
            ->leftJoin('department', 'forms.department_id', '=', 'department.department_id')
            ->whereBetween(DB::raw('DATE(feedback.submitted_at)'), [$validated['start_date'], $validated['end_date']])
            ->where('feedback.status', 'Valid');

        if ($targetId === 'all_non_cc') {
            $query->where('department.classification', 'Non-CC');
            $departmentName = 'University-Wide Summary (Non-CC)';
        } elseif ($targetId === 'all_cc') {
            $query->where('department.classification', 'CC');
            $departmentName = 'University-Wide Summary (With CC)';
        } else {
            return null; // Safety catch
        }

        return $this->processAndSave($query, $validated, $departmentName, null);
    }

    /**
     * Generates a Local Department summary for a Focal Person (or SuperAdmin selecting a specific office).
     */
    public function generateLocalSnapshot(array $validated): ?Report
    {
        $targetId = (int) $validated['department_id'];
        
        $query = DB::table('feedback')
            ->join('forms', 'feedback.form_id', '=', 'forms.form_id')
            ->leftJoin('department', 'forms.department_id', '=', 'department.department_id')
            ->whereBetween(DB::raw('DATE(feedback.submitted_at)'), [$validated['start_date'], $validated['end_date']])
            ->where('feedback.status', 'Valid')
            ->where('forms.department_id', $targetId);

        $departmentName = Department::where('department_id', $targetId)->value('department_name') ?? 'Unknown Department';

        return $this->processAndSave($query, $validated, $departmentName, $targetId);
    }

    /**
     * Shared engine that processes EAV data, computes ARTA math, and saves the snapshot.
     */
    private function processAndSave($query, array $validated, string $departmentName, ?int $departmentId): ?Report
    {
        $validResponses = $query->select('feedback.response_id', 'department.department_name')->get();
        $validResponseIds = $validResponses->pluck('response_id')->toArray();
        $totalRespondents = count($validResponseIds);

        if ($totalRespondents === 0) {
            return null; 
        }

        $deptMap = $validResponses->pluck('department_name', 'response_id')->toArray();

        $answers = DB::table('feedback_answers')
            ->join('form_fields', 'feedback_answers.field_id', '=', 'form_fields.field_id')
            ->whereIn('feedback_answers.response_id', $validResponseIds)
            ->select('feedback_answers.response_id', 'feedback_answers.answer_text', 'form_fields.field_label')
            ->get();

        $mappedData = [];
        foreach ($validResponseIds as $rId) {
            $mappedData[$rId] = [
                'department_name' => $deptMap[$rId] ?? 'Unknown Department',
                'transaction_type' => 'external',
                'client_type' => 'N/A', 'sex' => 'N/A', 'service_name' => 'N/A', 'region' => 'N/A',
                'cc1' => 'N/A', 'cc2' => 'N/A', 'cc3' => 'N/A',
                'sqd0' => 'na', 'sqd1' => 'na', 'sqd2' => 'na', 'sqd3' => 'na', 
                'sqd4' => 'na', 'sqd5' => 'na', 'sqd6' => 'na', 'sqd7' => 'na', 'sqd8' => 'na',
                'overall_satisfaction' => 'na', 'recommend_clsu' => 'N/A', 'harassment' => 'No', 'harassment_details' => null, 'comments' => null
            ];
        }

        foreach ($answers as $ans) {
            $rId = $ans->response_id;
            $label = strtolower(trim($ans->field_label));
            $val = trim($ans->answer_text);

            if (empty($val)) continue;

            $cleanLabel = str_replace([' ', '_', '-', '.', ':', '’', '\''], '', $label);
            $valLower = strtolower($val);

            if (str_contains($label, 'transaction type')) $mappedData[$rId]['transaction_type'] = $valLower === 'internal' ? 'internal' : 'external';
            elseif (str_contains($label, 'client type')) $mappedData[$rId]['client_type'] = $val;
            elseif (str_contains($label, 'sex')) $mappedData[$rId]['sex'] = $val;
            elseif (str_contains($label, 'region')) $mappedData[$rId]['region'] = $val;
            elseif (str_contains($label, 'service availed')) $mappedData[$rId]['service_name'] = $val;
            
            elseif (preg_match('/sqd([0-8])/i', $cleanLabel, $sqdMatch)) {
                $sqdKey = 'sqd' . $sqdMatch[1];
                $mappedData[$rId][$sqdKey] = $this->extractNumber($val);
            }
            elseif (str_contains($label, 'satisfied with the service')) $mappedData[$rId]['sqd0'] = $this->extractNumber($val);
            elseif (str_contains($label, 'reasonable amount of time')) $mappedData[$rId]['sqd1'] = $this->extractNumber($val);
            elseif (str_contains($label, 'requirement from the office')) $mappedData[$rId]['sqd2'] = $this->extractNumber($val);
            elseif (str_contains($label, 'payment) i needed to do') || str_contains($label, 'easy and simple')) $mappedData[$rId]['sqd3'] = $this->extractNumber($val);
            elseif (str_contains($label, 'easily found information')) $mappedData[$rId]['sqd4'] = $this->extractNumber($val);
            elseif (str_contains($label, 'paid a reasonable amount')) $mappedData[$rId]['sqd5'] = $this->extractNumber($val);
            elseif (str_contains($label, 'fair to everyone') || str_contains($label, 'walang palakasan')) $mappedData[$rId]['sqd6'] = $this->extractNumber($val);
            elseif (str_contains($label, 'treated courteously') || str_contains($label, 'staff was helpful')) $mappedData[$rId]['sqd7'] = $this->extractNumber($val);
            elseif (str_contains($label, 'got what i needed') || str_contains($label, 'denial of request')) $mappedData[$rId]['sqd8'] = $this->extractNumber($val);

            elseif (str_starts_with($cleanLabel, 'cc3') || str_contains($cleanLabel, 'cc3') || str_contains($label, 'help') || str_contains($valLower, 'helped very much') || str_contains($valLower, 'somewhat helped') || str_contains($valLower, 'did not help')) {
                $mappedData[$rId]['cc3'] = $val;
            } 
            elseif (str_starts_with($cleanLabel, 'cc2') || str_contains($cleanLabel, 'cc2') || str_contains($label, 'visibility') || str_contains($label, 'office was') || str_contains($valLower, 'easy to see') || str_contains($valLower, 'difficult to see') || str_contains($valLower, 'not visible')) {
                $mappedData[$rId]['cc2'] = $val;
            } 
            elseif (str_starts_with($cleanLabel, 'cc1') || str_contains($cleanLabel, 'cc1') || str_contains($label, 'awareness') || str_contains($valLower, 'know what a cc') || str_contains($valLower, 'learned of the cc') || str_contains($valLower, 'do not know')) {
                if ($valLower !== 'n/a' && $valLower !== 'na') $mappedData[$rId]['cc1'] = $val;
            }
            
            elseif (str_contains($label, 'educational experience')) $mappedData[$rId]['overall_satisfaction'] = $this->extractNumber($val);
            elseif (str_contains($label, 'recommend')) $mappedData[$rId]['recommend_clsu'] = ucfirst(strtolower($val)); 
            elseif (str_contains($label, 'harassment') && in_array($valLower, ['yes', 'no'])) $mappedData[$rId]['harassment'] = ucfirst(strtolower($val));
            elseif (str_contains($label, 'detail the harassment') || str_contains($label, 'experienced') || (str_contains($label, 'if yes') && str_contains($label, 'harassment'))) $mappedData[$rId]['harassment_details'] = $val;
            elseif (str_contains($label, 'suggestions') || str_contains($label, 'comments')) $mappedData[$rId]['comments'] = $val;
        }

        $collection = collect(array_values($mappedData));

        $demographics = [
            'client_type' => $this->calculateFrequencies($collection, 'client_type', $totalRespondents),
            'sex'         => $this->calculateFrequencies($collection, 'sex', $totalRespondents),
            'region'      => $this->calculateFrequencies($collection, 'region', $totalRespondents),
            'services'    => $this->calculateFrequencies($collection, 'service_name', $totalRespondents),
        ];

        $table2Data = ['internal' => [], 'external' => []];
        foreach ($collection as $item) {
            $transType = $item['transaction_type'];
            $dept = $item['department_name'];
            $service = $item['service_name'];
            
            if (!isset($table2Data[$transType][$dept][$service])) {
                $table2Data[$transType][$dept][$service] = 0;
            }
            $table2Data[$transType][$dept][$service]++;
        }

        $ccMetrics = [];
        $ccFormulas = [];
        
        if ($validated['report_type'] === 'cc') {
            $ccMetrics = [
                'cc1' => $this->calculateFrequencies($collection, 'cc1', $totalRespondents),
                'cc2' => $this->calculateFrequencies($collection, 'cc2', $totalRespondents),
                'cc3' => $this->calculateFrequencies($collection, 'cc3', $totalRespondents),
            ];
            
            $cc1Valid = $totalRespondents - ($ccMetrics['cc1']['N/A']['count'] ?? 0);
            $cc2Valid = $totalRespondents - ($ccMetrics['cc2']['5. N/A']['count'] ?? 0) - ($ccMetrics['cc2']['N/A']['count'] ?? 0);
            $cc3Valid = $totalRespondents - ($ccMetrics['cc3']['N/A']['count'] ?? 0);

            $cc1Aware = ($ccMetrics['cc1']['1. I know what a CC is and I saw this office’s CC.']['count'] ?? 0) + 
                        ($ccMetrics['cc1']['2. I know what a CC is but I did NOT see this office’s CC.']['count'] ?? 0) + 
                        ($ccMetrics['cc1']['3. I learned of the CC only when I saw this office’s CC.']['count'] ?? 0);
                        
            $cc2Visible = ($ccMetrics['cc2']['1. Easy to see']['count'] ?? 0) + 
                          ($ccMetrics['cc2']['2. Somewhat easy to see']['count'] ?? 0) + 
                          ($ccMetrics['cc2']['Easy to see']['count'] ?? 0) + 
                          ($ccMetrics['cc2']['Somewhat easy to see']['count'] ?? 0);

            $cc3Helpful = ($ccMetrics['cc3']['Helped very much']['count'] ?? 0) + 
                          ($ccMetrics['cc3']['Somewhat helped']['count'] ?? 0);

            $ccFormulas = [
                'cc1_aware' => $cc1Valid > 0 ? round(($cc1Aware / $cc1Valid) * 100, 2) : 0,
                'cc2_visible' => $cc2Valid > 0 ? round(($cc2Visible / $cc2Valid) * 100, 2) : 0,
                'cc3_helpful' => $cc3Valid > 0 ? round(($cc3Helpful / $cc3Valid) * 100, 2) : 0,
            ];
            $ccFormulas['overall'] = round(($ccFormulas['cc1_aware'] + $ccFormulas['cc2_visible'] + $ccFormulas['cc3_helpful']) / 3, 2);
        } else {
            $ccMetrics = [
                'cc1' => ['N/A' => ['count' => '0', 'percent' => '0']],
                'cc2' => ['N/A' => ['count' => '0', 'percent' => '0']],
                'cc3' => ['N/A' => ['count' => '0', 'percent' => '0']],
            ];
            $ccFormulas = ['cc1_aware' => '0', 'cc2_visible' => '0', 'cc3_helpful' => '0', 'overall' => '0'];
        }

        $sqdQuestions = ['sqd0', 'sqd1', 'sqd2', 'sqd3', 'sqd4', 'sqd5', 'sqd6', 'sqd7', 'sqd8', 'overall_satisfaction'];
        $sqdMetrics = ['overall' => [], 'internal' => [], 'external' => []];
        
        $internalCollection = $collection->where('transaction_type', 'internal');
        $externalCollection = $collection->where('transaction_type', 'external');

        foreach ($sqdQuestions as $sqd) {
            $sqdMetrics['overall'][$sqd] = $this->calculateSQD($collection, $sqd);
            $sqdMetrics['internal'][$sqd] = $this->calculateSQD($internalCollection, $sqd);
            $sqdMetrics['external'][$sqd] = $this->calculateSQD($externalCollection, $sqd);
        }

        $periodLabel = Carbon::parse($validated['start_date'])->format('M d, Y') . ' - ' . Carbon::parse($validated['end_date'])->format('M d, Y');
        $defaultTitle = $departmentName . ' - ' . $periodLabel;
        $customName = trim((string) ($validated['report_name'] ?? ''));

        $reportPayload = [
            'metadata' => [
                'report_name'       => $customName !== '' ? $customName : $defaultTitle,
                'department'        => $departmentName,
                'period'            => $periodLabel,
                'total_respondents' => $totalRespondents,
                'type'              => $validated['report_type'],
                'format'            => $validated['export_format'],
            ],
            'demographics'       => $demographics,
            'table2_data'        => $table2Data,
            'cc_metrics'         => $ccMetrics,
            'cc_formulas'        => $ccFormulas,
            'sqd_metrics'        => $sqdMetrics,
            'recommendations'    => $this->calculateFrequencies($collection, 'recommend_clsu', $totalRespondents),
            'harassment'         => $this->calculateFrequencies($collection, 'harassment', $totalRespondents),
            'harassment_details' => $collection->pluck('harassment_details')->filter()->values()->toArray(),
            'comments'           => $collection->pluck('comments')->filter()->values()->toArray()
        ];

       $newReport = Report::create([
            'department_id' => $departmentId,
            'report_type'   => $validated['report_type'],
            'start_date'    => $validated['start_date'],
            'end_date'      => $validated['end_date'],
            'export_format' => $validated['export_format'],
            'report_data'   => $reportPayload,
            'generated_by'  => Auth::id(),
        ]);

        // Safely inject report_name only if the physical database column exists
        if (\Illuminate\Support\Facades\Schema::hasColumn('reports', 'report_name')) {
            $newReport->report_name = $reportPayload['metadata']['report_name'];
            $newReport->save();
        }

        return $newReport;
    }

    private function extractNumber($val)
    {
        if (empty($val) || in_array(strtolower(trim($val)), ['n/a', 'na', 'none'])) return 'na';
        if (preg_match('/^[1-5]/', trim($val), $matches)) {
            return $matches[0];
        }
        return 'na';
    }

    private function calculateFrequencies($collection, $column, $total): array
    {
        $counts = $collection->pluck($column)->countBy()->toArray();
        $result = [];
        foreach ($counts as $key => $count) {
            $keyName = empty($key) ? 'N/A' : $key;
            $result[$keyName] = [
                'count'   => $count,
                'percent' => round(($count / $total) * 100, 2)
            ];
        }
        return $result;
    }

    private function calculateSQD($collection, $column): array
    {
        $counts = ['5' => 0, '4' => 0, '3' => 0, '2' => 0, '1' => 0, 'na' => 0];
        $sum = 0; $validResponses = 0; 
        foreach ($collection as $item) {
            $val = $item[$column] ?? 'na';
            if ($val === 'na') {
                $counts['na']++;
            } elseif (isset($counts[$val])) {
                $counts[$val]++; $sum += (int)$val; $validResponses++;
            }
        }
        $totalResponses = array_sum($counts);
        $mean = $validResponses > 0 ? round($sum / $validResponses, 2) : 0;
        $percentages = ['5' => 0, '4' => 0, '3' => 0, '2' => 0, '1' => 0, 'na' => 0];
        if ($totalResponses > 0) {
            foreach ($counts as $key => $count) {
                $percentages[$key] = round(($count / $totalResponses) * 100, 2);
            }
        }
        $percentage = $validResponses > 0 ? round((($counts['5'] + $counts['4']) / $validResponses) * 100, 2) : 0;
        return [
            'counts'          => $counts,
            'percentages'     => $percentages, 
            'total_responses' => $totalResponses,
            'percentage'      => $percentage,  
            'mean'            => $mean > 0 ? number_format($mean, 2) : '',
            'adjectival'      => $this->getAdjectivalRating($mean)
        ];
    }

    private function getAdjectivalRating($mean): string
    {
        if ($mean == 0) return ''; 
        if ($mean >= 4.21) return 'Excellent';
        if ($mean >= 3.41) return 'Very Good';
        if ($mean >= 2.61) return 'Good';
        if ($mean >= 1.81) return 'Fair';
        return 'Needs Improvement';
    }
}