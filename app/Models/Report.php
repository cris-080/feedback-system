<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use App\Models\Department;

class Report extends Model
{
    use HasFactory;

    protected $table = 'reports';
    protected $primaryKey = 'id';

    protected $fillable = [
        'department_id',
        'report_type',
        'start_date',
        'end_date',
        'export_format',
        'report_data',
        'generated_by'
    ];

    protected $casts = [
        'report_data' => 'array',
    ];

    public function department()
    {
        return $this->belongsTo(Department::class, 'department_id', 'department_id');
    }

    public function generator()
    {
        return $this->belongsTo(Account::class, 'generated_by', 'user_id');
    }

    // --- FAT MODEL METHOD ---
    public static function generateSnapshot(array $validated): ?self
    {
        // 1. Join Feedback to Forms to access 'department_id'
        $query = DB::table('feedback')
            ->join('forms', 'feedback.form_id', '=', 'forms.form_id')
            ->whereBetween(DB::raw('DATE(feedback.submitted_at)'), [$validated['start_date'], $validated['end_date']])
            ->where('feedback.status', 'Valid'); // Only crunch valid, non-spam feedback

        if ($validated['department_id'] !== 'all') {
            $query->where('forms.department_id', $validated['department_id']);
        }

        $validResponseIds = $query->pluck('feedback.response_id')->toArray();
        $totalRespondents = count($validResponseIds);

        if ($totalRespondents === 0) {
            return null; 
        }

        // 2. Fetch the dynamic answers from the EAV structure
        $answers = DB::table('feedback_answers')
            ->join('form_fields', 'feedback_answers.field_id', '=', 'form_fields.field_id')
            ->whereIn('feedback_answers.response_id', $validResponseIds)
            ->select('feedback_answers.response_id', 'feedback_answers.answer_text', 'form_fields.field_label')
            ->get();

        // 3. Flatten the dynamic structure into a readable array for the Math Engine
        $mappedData = [];
        foreach ($validResponseIds as $rId) {
            $mappedData[$rId] = [
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

            if (str_contains($label, 'client type')) $mappedData[$rId]['client_type'] = $val;
            elseif (str_contains($label, 'sex')) $mappedData[$rId]['sex'] = $val;
            elseif (str_contains($label, 'region')) $mappedData[$rId]['region'] = $val;
            elseif (str_contains($label, 'service availed')) $mappedData[$rId]['service_name'] = $val;
         // PRIORITY 1: Handle SQD 0-8 FIRST to prevent overlap with CC keywords
            elseif (preg_match('/sqd([0-8])/i', $cleanLabel, $sqdMatch)) {
                $sqdKey = 'sqd' . $sqdMatch[1]; // e.g., "sqd6"
                $mappedData[$rId][$sqdKey] = self::extractNumber($val);
            }
            elseif (str_contains($label, 'satisfied with the service')) $mappedData[$rId]['sqd0'] = self::extractNumber($val);
            elseif (str_contains($label, 'reasonable amount of time')) $mappedData[$rId]['sqd1'] = self::extractNumber($val);
            elseif (str_contains($label, 'requirement from the office')) $mappedData[$rId]['sqd2'] = self::extractNumber($val);
            elseif (str_contains($label, 'payment) i needed to do') || str_contains($label, 'easy and simple')) $mappedData[$rId]['sqd3'] = self::extractNumber($val);
            elseif (str_contains($label, 'easily found information')) $mappedData[$rId]['sqd4'] = self::extractNumber($val);
            elseif (str_contains($label, 'paid a reasonable amount')) $mappedData[$rId]['sqd5'] = self::extractNumber($val);
            elseif (str_contains($label, 'fair to everyone') || str_contains($label, 'walang palakasan')) $mappedData[$rId]['sqd6'] = self::extractNumber($val);
            elseif (str_contains($label, 'treated courteously') || str_contains($label, 'staff was helpful')) $mappedData[$rId]['sqd7'] = self::extractNumber($val);
            elseif (str_contains($label, 'got what i needed') || str_contains($label, 'denial of request')) $mappedData[$rId]['sqd8'] = self::extractNumber($val);

            // PRIORITY 2: Evaluate CC3
            elseif (
                str_starts_with($cleanLabel, 'cc3') || 
                str_contains($cleanLabel, 'cc3') ||
                str_contains($label, 'help') || 
                str_contains($valLower, 'helped very much') || 
                str_contains($valLower, 'somewhat helped') || 
                str_contains($valLower, 'did not help')
            ) {
                $mappedData[$rId]['cc3'] = $val;
            } 
            // PRIORITY 3: Evaluate CC2
            elseif (
                str_starts_with($cleanLabel, 'cc2') || 
                str_contains($cleanLabel, 'cc2') ||
                str_contains($label, 'visibility') || 
                str_contains($label, 'office was') || 
                str_contains($valLower, 'easy to see') || 
                str_contains($valLower, 'difficult to see') || 
                str_contains($valLower, 'not visible')
            ) {
                $mappedData[$rId]['cc2'] = $val;
            } 
            // PRIORITY 4: Evaluate CC1
            elseif (
                str_starts_with($cleanLabel, 'cc1') || 
                str_contains($cleanLabel, 'cc1') || 
                str_contains($label, 'awareness') || 
                str_contains($valLower, 'know what a cc') || 
                str_contains($valLower, 'learned of the cc') || 
                str_contains($valLower, 'do not know')
            ) {
                if ($valLower !== 'n/a' && $valLower !== 'na') {
                    $mappedData[$rId]['cc1'] = $val;
                }
            }
            
           // Overall Satisfaction
            elseif (str_contains($label, 'educational experience')) {
                $mappedData[$rId]['overall_satisfaction'] = self::extractNumber($val);
            }
            // Recommend CLSU
            elseif (str_contains($label, 'recommend')) {
                // Force proper capitalization (Yes/No) so the grouping works perfectly
                $mappedData[$rId]['recommend_clsu'] = ucfirst(strtolower($val)); 
            }
            // Harassment
            elseif (str_contains($label, 'harassment') && in_array(strtolower($val), ['yes', 'no'])) {
                $mappedData[$rId]['harassment'] = ucfirst(strtolower($val));
            }
            elseif (str_contains($label, 'detail the harassment') || str_contains($label, 'experienced') || (str_contains($label, 'if yes') && str_contains($label, 'harassment'))) {
                $mappedData[$rId]['harassment_details'] = $val;
            }
            elseif (str_contains($label, 'suggestions') || str_contains($label, 'comments')) {
                $mappedData[$rId]['comments'] = $val;
            }
        }

        $collection = collect(array_values($mappedData));

        // 4. Process ARTA Math
        $demographics = [
            'client_type' => self::calculateFrequencies($collection, 'client_type', $totalRespondents),
            'sex'         => self::calculateFrequencies($collection, 'sex', $totalRespondents),
            'region'      => self::calculateFrequencies($collection, 'region', $totalRespondents),
            'services'    => self::calculateFrequencies($collection, 'service_name', $totalRespondents),
        ];

        $ccMetrics = [];
        if ($validated['report_type'] === 'cc') {
            $ccMetrics = [
                'cc1' => self::calculateFrequencies($collection, 'cc1', $totalRespondents),
                'cc2' => self::calculateFrequencies($collection, 'cc2', $totalRespondents),
                'cc3' => self::calculateFrequencies($collection, 'cc3', $totalRespondents),
            ];
        }

        $sqdQuestions = ['sqd0', 'sqd1', 'sqd2', 'sqd3', 'sqd4', 'sqd5', 'sqd6', 'sqd7', 'sqd8', 'overall_satisfaction'];
        $sqdMetrics = [];
        
        foreach ($sqdQuestions as $sqd) {
            $sqdMetrics[$sqd] = self::calculateSQD($collection, $sqd);
        }

        $departmentName = $validated['department_id'] === 'all' 
            ? 'All Departments (Global)' 
            : Department::where('department_id', $validated['department_id'])->value('department_name');

        $reportPayload = [
            'metadata' => [
                'department'        => $departmentName,
                'period'            => Carbon::parse($validated['start_date'])->format('M d, Y') . ' - ' . Carbon::parse($validated['end_date'])->format('M d, Y'),
                'total_respondents' => $totalRespondents,
                'type'              => $validated['report_type'],
                'format'            => $validated['export_format'],
            ],
            'demographics'       => $demographics,
            'cc_metrics'         => $ccMetrics,
            'sqd_metrics'        => $sqdMetrics,
            'recommendations'    => self::calculateFrequencies($collection, 'recommend_clsu', $totalRespondents),
            'harassment'         => self::calculateFrequencies($collection, 'harassment', $totalRespondents),
            'harassment_details' => $collection->pluck('harassment_details')->filter()->values()->toArray(),
            'comments'           => $collection->pluck('comments')->filter()->values()->toArray()
        ];

      // 5. Save Snapshot 
        $newReport = self::create([
            'department_id' => $validated['department_id'] === 'all' ? null : $validated['department_id'],
            'report_type'   => $validated['report_type'],
            'start_date'    => $validated['start_date'],
            'end_date'      => $validated['end_date'],
            'export_format' => $validated['export_format'],
            'report_data'   => $reportPayload,
            'generated_by'  => Auth::id(),
        ]);

        return $newReport; 
    }

    // --- PRIVATE MATH HELPERS ---
    private static function extractNumber($val)
    {
        if (empty($val) || in_array(strtolower(trim($val)), ['n/a', 'na', 'none'])) return 'na';
        if (preg_match('/^[1-5]/', trim($val), $matches)) {
            return $matches[0];
        }
        return 'na';
    }

    private static function calculateFrequencies($collection, $column, $total): array
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

    private static function calculateSQD($collection, $column): array
    {
        $counts = ['5' => 0, '4' => 0, '3' => 0, '2' => 0, '1' => 0, 'na' => 0];
        $sum = 0;
        $validResponses = 0; 

        foreach ($collection as $item) {
            $val = $item[$column] ?? 'na';
            
            if ($val === 'na') {
                $counts['na']++;
            } elseif (isset($counts[$val])) {
                $counts[$val]++;
                $sum += (int)$val;
                $validResponses++;
            }
        }

        $mean = $validResponses > 0 ? round($sum / $validResponses, 2) : 0;

        return [
            'counts'     => $counts,
            'mean'       => $mean > 0 ? number_format($mean, 2) : '',
            'adjectival' => self::getAdjectivalRating($mean)
        ];
    }

    private static function getAdjectivalRating($mean): string
    {
        if ($mean == 0) return ''; 
        if ($mean >= 4.21) return 'Excellent';
        if ($mean >= 3.41) return 'Very Good';
        if ($mean >= 2.61) return 'Good';
        if ($mean >= 1.81) return 'Fair';
        return 'Needs Improvement';
    }
}