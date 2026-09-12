<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class Feedback extends Model
{
    protected $table = 'feedback';
    protected $primaryKey = 'response_id';
    public $timestamps = false; 

    // Allow mass assignment for transaction_date along with existing fields
    protected $fillable = [
        'form_id',
        'client_type',
        'client_classification',
        'transaction_type',
        'transaction_date',
        'sex',
        'age',
        // ... (Keep your other mass assignable fields here if any)
    ];

    /**
     * Process and store the submitted feedback, answers, and AI sentiment.
     */
    public static function processSubmission(array $validated)
    {
        DB::transaction(function () use ($validated) {
            $qrRecord = DB::table('qr_code')
                ->select('qr_id')
                ->where('department_id', $validated['department_id'])
                ->first();
            $qrId = $qrRecord ? $qrRecord->qr_id : 1;

            $controlNumber = 'CTRL-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -5));

            // Insert into the feedback table, including the new transaction_date
            $responseId = DB::table('feedback')->insertGetId([
                'control_number'   => $controlNumber,
                'email_address'    => $validated['email_address'],
                'transaction_date' => $validated['transaction_date'], // Inserted here
                'submitted_at'     => now(),
                'qr_id'            => $qrId,
                'form_id'          => $validated['form_id'],
                'status'           => 'Valid',
            ]);

            // Insert strictly into available schema columns
            DB::table('sentiment_analysis')->insert([
                'response_id'      => $responseId,
                'sentiment'        => $validated['sentiment'] ?? 'Uncategorized',
                'confidence_score' => (int) ($validated['ai_confidence'] ?? 0),
                'analyzed_at'      => now(),
            ]);

            $answersToInsert = [];
            foreach ($validated['answers'] as $fieldId => $answerValue) {
                if (is_array($answerValue)) {
                    $answerValue = implode(', ', $answerValue);
                }

                if ($answerValue !== null && $answerValue !== '') {
                    $answersToInsert[] = [
                        'response_id' => $responseId,
                        'field_id'    => $fieldId,
                        'answer_text' => $answerValue,
                    ];
                }
            }

            if (!empty($answersToInsert)) {
                DB::table('feedback_answers')->insert($answersToInsert);
            }
        });
    }

    public static function getTotalCount()
    {
        return self::count();
    }

    /*
    |--------------------------------------------------------------------------
    | Dashboard Analytics & Filtering Methods (Fat Model)
    |--------------------------------------------------------------------------
    */

    /**
     * Apply date range filtering to a query builder instance.
     */
    public static function applyDateFilter($query, $column, $range)
    {
        $now = Carbon::now();
        switch ($range) {
            case 'today':
                return $query->whereDate($column, $now->toDateString());
            case 'week':
                return $query->whereBetween($column, [$now->startOfWeek()->toDateString(), $now->endOfWeek()->toDateString()]);
            case 'month':
                return $query->whereMonth($column, $now->month)->whereYear($column, $now->year);
            case 'year':
                return $query->whereYear($column, $now->year);
            case 'custom_date':
                if (request('specific_date')) {
                    return $query->whereDate($column, request('specific_date'));
                }
                return $query;
            case 'custom_month':
                if (request('specific_month')) {
                    $date = Carbon::parse(request('specific_month'));
                    return $query->whereMonth($column, $date->month)->whereYear($column, $date->year);
                }
                return $query;
            case 'all':
            default:
                return $query;
        }
    }

    /**
     * Get total filtered feedback count by range and department.
     */
    public static function getFilteredCount($range, $departmentId = 'overall')
    {
        $query = DB::table('feedback')
            ->join('forms', 'feedback.form_id', '=', 'forms.form_id');

        if ($departmentId !== 'overall') {
            $query->where('forms.department_id', $departmentId);
        }

        self::applyDateFilter($query, 'feedback.submitted_at', $range);
        return $query->count();
    }

    /**
     * Get harassment alert count based on dynamic search, range, and department.
     */
    public static function getHarassmentAlerts($range, $departmentId = 'overall')
    {
        $query = DB::table('feedback_answers')
            ->join('feedback', 'feedback_answers.response_id', '=', 'feedback.response_id')
            ->join('forms', 'feedback.form_id', '=', 'forms.form_id')
            ->join('form_fields', 'feedback_answers.field_id', '=', 'form_fields.field_id')
            ->where('form_fields.field_label', 'LIKE', '%harassment%')
            ->where('feedback_answers.answer_text', 'Yes');

        if ($departmentId !== 'overall') {
            $query->where('forms.department_id', $departmentId);
        }

        self::applyDateFilter($query, 'feedback.submitted_at', $range);
        return $query->count();
    }

    /**
     * Calculate global sentiment percentage.
     */
    public static function getGlobalSentiment($range)
    {
        $query = DB::table('sentiment_analysis')
            ->join('feedback', 'sentiment_analysis.response_id', '=', 'feedback.response_id');
        
        self::applyDateFilter($query, 'feedback.submitted_at', $range);

        $total = $query->count();
        if ($total === 0) return '0%';

        $posQuery = clone $query;
        $positive = $posQuery->where('sentiment', 'Positive')->count();

        return round(($positive / $total) * 100) . '%';
    }

    /**
     * Get trend data formatted for Recharts with zero-filled timeline skeletons.
     */
    public static function getTrendData($range, $departmentId)
    {
        $now = Carbon::now();
        $skeleton = [];

        // 1. Build a complete chronological timeline skeleton based on range
        if ($range === 'week') {
            $start = (clone $now)->startOfWeek();
            $end = (clone $now)->endOfWeek();
            while ($start <= $end) {
                $label = $start->format('M d');
                $skeleton[$label] = ['month' => $label, 'Positive' => 0, 'Negative' => 0, 'Neutral' => 0, 'Mixed' => 0];
                $start->addDay();
            }
            $dateFormat = '%b %d';
        } elseif ($range === 'today' || $range === 'custom_date') {
            for ($h = 0; $h < 24; $h++) {
                $time = Carbon::today()->setHour($h)->setMinute(0);
                $label = $time->format('h:00 A');
                $skeleton[$label] = ['month' => $label, 'Positive' => 0, 'Negative' => 0, 'Neutral' => 0, 'Mixed' => 0];
            }
            $dateFormat = '%h:00 %p';
        } elseif ($range === 'year' || $range === 'all') {
            for ($m = 1; $m <= 12; $m++) {
                $monthName = Carbon::create(null, $m, 1)->format('M');
                $skeleton[$monthName] = ['month' => $monthName, 'Positive' => 0, 'Negative' => 0, 'Neutral' => 0, 'Mixed' => 0];
            }
            $dateFormat = '%b';
        } elseif ($range === '90_days') {
            // NEW: Build a 90-day skeleton ending today
            $start = (clone $now)->subDays(89)->startOfDay(); // 89 days ago + today = 90 days
            $end = (clone $now)->endOfDay();
            
            while ($start <= $end) {
                $label = $start->format('M d');
                $skeleton[$label] = ['month' => $label, 'Positive' => 0, 'Negative' => 0, 'Neutral' => 0, 'Mixed' => 0];
                $start->addDay();
            }
            $dateFormat = '%b %d';
        } else {
            // Fallback for custom month or current month
            $targetMonth = ($range === 'custom_month' && request('specific_month')) 
                ? Carbon::parse(request('specific_month')) 
                : $now;
            
            $daysInMonth = $targetMonth->daysInMonth;
            for ($d = 1; $d <= $daysInMonth; $d++) {
                $label = $targetMonth->copy()->day($d)->format('M d');
                $skeleton[$label] = ['month' => $label, 'Positive' => 0, 'Negative' => 0, 'Neutral' => 0, 'Mixed' => 0];
            }
            $dateFormat = '%b %d';
        }

        // 2. Fetch recorded sentiment counts from the database
        $query = DB::table('sentiment_analysis')
            ->join('feedback', 'sentiment_analysis.response_id', '=', 'feedback.response_id')
            ->join('forms', 'feedback.form_id', '=', 'forms.form_id')
            ->select(
                DB::raw("DATE_FORMAT(feedback.submitted_at, '{$dateFormat}') as time_label"),
                'sentiment_analysis.sentiment',
                DB::raw('COUNT(*) as total')
            );

        if ($departmentId !== 'overall') {
            $query->where('forms.department_id', $departmentId);
        }

        // 3. Apply Date Filtering Logic
        if ($range === '90_days') {
            // Custom filter override to grab exactly the last 90 days
            $query->where('feedback.submitted_at', '>=', Carbon::now()->subDays(89)->startOfDay());
        } else {
            // Standard filter fallback
            self::applyDateFilter($query, 'feedback.submitted_at', $range);
        }

        $rawTrends = $query->groupBy('time_label', 'sentiment_analysis.sentiment')->get();

        // 4. Populate skeleton with actual database totals
        foreach ($rawTrends as $row) {
            $label = $row->time_label;
            if (isset($skeleton[$label])) {
                $sentiment = $row->sentiment;
                if (isset($skeleton[$label][$sentiment])) {
                    $skeleton[$label][$sentiment] = (int) $row->total;
                }
            }
        }

        return array_values($skeleton);
    }

    /**
     * Get office performance metrics (Best to Worst).
     */
    public static function getDepartmentScores($range)
    {
        $departments = DB::table('department')->get();
        $scores = [];

        foreach ($departments as $dept) {
            $query = DB::table('feedback')
                ->join('forms', 'feedback.form_id', '=', 'forms.form_id')
                ->leftJoin('sentiment_analysis', 'feedback.response_id', '=', 'sentiment_analysis.response_id')
                ->where('forms.department_id', $dept->department_id);

            self::applyDateFilter($query, 'feedback.submitted_at', $range);

            $total = (clone $query)->count();

            if ($total === 0) {
                $score = 0;
            } else {
                // Calculate percentage of Positive + Neutral (non-negative) ratings
                $positiveCount = (clone $query)->whereIn('sentiment_analysis.sentiment', ['Positive', 'Neutral'])->count();
                $score = round(($positiveCount / $total) * 100);
            }

            $shortName = str_replace(['Department of ', 'Office of ', 'College of '], '', $dept->department_name);

            $scores[] = [
                'department_id' => $dept->department_id,
                'name'          => $shortName,
                'full_name'     => $dept->department_name,
                'score'         => $score,
                'total'         => $total,
            ];
        }

        // Sort from Highest (Best) to Lowest (Worst)
        usort($scores, fn($a, $b) => $b['score'] <=> $a['score']);

        return $scores;
    }

    /**
     * Calculate Trends (Current Period vs Previous Period) filtered by department.
     */
    public static function getTrends($range, $departmentId = 'overall')
    {
        if ($range === 'all') {
            return null; 
        }

        $now = Carbon::now();
        $currStart = clone $now; $currEnd = clone $now;
        $prevStart = clone $now; $prevEnd = clone $now;

        switch ($range) {
            case 'today':
                $currStart->startOfDay(); $currEnd->endOfDay();
                $prevStart->subDay()->startOfDay(); $prevEnd->subDay()->endOfDay();
                break;
            case 'week':
                $currStart->startOfWeek(); $currEnd->endOfWeek();
                $prevStart->subWeek()->startOfWeek(); $prevEnd->subWeek()->endOfWeek();
                break;
            case 'month':
                $currStart->startOfMonth(); $currEnd->endOfMonth();
                $prevStart->subMonth()->startOfMonth(); $prevEnd->subMonth()->endOfMonth();
                break;
            case 'year':
                $currStart->startOfYear(); $currEnd->endOfYear();
                $prevStart->subYear()->startOfYear(); $prevEnd->subYear()->endOfYear();
                break;
            case 'custom_date':
                if (!request('specific_date')) return null;
                $date = Carbon::parse(request('specific_date'));
                $currStart = clone $date->startOfDay(); $currEnd = clone $date->endOfDay();
                $prevStart = clone $date->subDay()->startOfDay(); $prevEnd = clone $date->subDay()->endOfDay();
                break;
            case 'custom_month':
                if (!request('specific_month')) return null;
                $date = Carbon::parse(request('specific_month'));
                $currStart = clone $date->startOfMonth(); $currEnd = clone $date->endOfMonth();
                $prevStart = clone $date->subMonth()->startOfMonth(); $prevEnd = clone $date->subMonth()->endOfMonth();
                break;
        }

        $baseFeedback = DB::table('feedback')
            ->join('forms', 'feedback.form_id', '=', 'forms.form_id');

        if ($departmentId !== 'overall') {
            $baseFeedback->where('forms.department_id', $departmentId);
        }

        $currFeedback = (clone $baseFeedback)->whereBetween('feedback.submitted_at', [$currStart, $currEnd])->count();
        $prevFeedback = (clone $baseFeedback)->whereBetween('feedback.submitted_at', [$prevStart, $prevEnd])->count();

        $getHarassment = function($start, $end) use ($departmentId) {
            $q = DB::table('feedback_answers')
                ->join('feedback', 'feedback_answers.response_id', '=', 'feedback.response_id')
                ->join('forms', 'feedback.form_id', '=', 'forms.form_id')
                ->join('form_fields', 'feedback_answers.field_id', '=', 'form_fields.field_id')
                ->where('form_fields.field_label', 'LIKE', '%harassment%')
                ->where('feedback_answers.answer_text', 'Yes')
                ->whereBetween('feedback.submitted_at', [$start, $end]);

            if ($departmentId !== 'overall') {
                $q->where('forms.department_id', $departmentId);
            }

            return $q->count();
        };

        return [
            'feedback'   => $currFeedback - $prevFeedback,
            'harassment' => $getHarassment($currStart, $currEnd) - $getHarassment($prevStart, $prevEnd),
            'forms'      => 0 
        ];
    }

    /**
     * Resilient SQD Likert Scale Data query
     */
    public static function getSqdData($range, $departmentId)
    {
        $query = DB::table('feedback_answers')
            ->join('feedback', 'feedback_answers.response_id', '=', 'feedback.response_id')
            ->join('form_fields', 'feedback_answers.field_id', '=', 'form_fields.field_id')
            ->join('forms', 'feedback.form_id', '=', 'forms.form_id')
            ->where('form_fields.field_label', 'LIKE', '%SQD%') 
            ->select(
                'form_fields.field_label',
                'feedback_answers.answer_text',
                DB::raw('COUNT(*) as count')
            );

        if ($departmentId !== 'overall') {
            $query->where('forms.department_id', $departmentId);
        }

        self::applyDateFilter($query, 'feedback.submitted_at', $range);

        $results = $query->groupBy('form_fields.field_label', 'feedback_answers.answer_text')->get();

        $sqdNames = [
            'SQD0' => 'Satisfaction', 'SQD1' => 'Time', 'SQD2' => 'Requirements',
            'SQD3' => 'Simplicity',   'SQD4' => 'Information', 'SQD5' => 'Fees',
            'SQD6' => 'Fairness',     'SQD7' => 'Courtesy',    'SQD8' => 'Outcome',
        ];

        $textToScore = [
            'strongly agree' => '5', 'agree' => '4', 'neutral' => '3',
            'disagree' => '2', 'strongly disagree' => '1'
        ];

        $formatted = [];
        foreach ($results as $row) {
            preg_match('/SQD[0-8]/i', $row->field_label, $matches);
            if (empty($matches)) continue;
            
            $sqdKey = strtoupper($matches[0]);
            $rawAnswer = trim($row->answer_text);

            $score = null;
            if (preg_match('/^[1-5]/', $rawAnswer, $scoreMatch)) {
                $score = $scoreMatch[0];
            } elseif (isset($textToScore[strtolower($rawAnswer)])) {
                $score = $textToScore[strtolower($rawAnswer)];
            }

            if (!$score) continue;

            if (!isset($formatted[$sqdKey])) {
                $name = isset($sqdNames[$sqdKey]) ? $sqdKey . ': ' . $sqdNames[$sqdKey] : $sqdKey;
                $formatted[$sqdKey] = ['name' => $name, '5' => 0, '4' => 0, '3' => 0, '2' => 0, '1' => 0];
            }
            
            $formatted[$sqdKey][$score] += (int) $row->count;
        }

        return array_values($formatted);
    }

    /**
     * Resilient Demographics query with strict label and value matching.
     */
    public static function getDemographics($range, $departmentId, $searchKeyword)
    {
        $query = DB::table('feedback_answers')
            ->join('feedback', 'feedback_answers.response_id', '=', 'feedback.response_id')
            ->join('form_fields', 'feedback_answers.field_id', '=', 'form_fields.field_id')
            ->join('forms', 'feedback.form_id', '=', 'forms.form_id')
            ->select('feedback_answers.answer_text as name', DB::raw('COUNT(*) as value'));

        $keyword = strtolower(trim($searchKeyword));

        if ($keyword === 'transaction' || $keyword === 'transaction type') {
            $query->where('form_fields.field_label', 'Transaction Type')
                  ->whereIn('feedback_answers.answer_text', ['Internal', 'External']);
        } elseif ($keyword === 'sex') {
            $query->where('form_fields.field_label', 'Sex')
                  ->whereIn('feedback_answers.answer_text', ['Male', 'Female']);
        } elseif ($keyword === 'client') {
            $query->where(function ($q) {
                $q->where('form_fields.field_label', 'Client Type')
                  ->orWhere('form_fields.field_label', 'Client Classification');
            });
        } elseif ($keyword === 'region') {
            $query->where(function ($q) {
                $q->where('form_fields.field_label', 'like', '%region of residence%')
                  ->orWhere('form_fields.field_label', 'like', '%region%');
            });
        } else {
            $query->where('form_fields.field_label', 'LIKE', '%' . $searchKeyword . '%');
        }

        if ($departmentId !== 'overall') {
            $query->where('forms.department_id', $departmentId);
        }

        self::applyDateFilter($query, 'feedback.submitted_at', $range);

        $results = $query->whereNotNull('feedback_answers.answer_text')
                         ->where('feedback_answers.answer_text', '!=', '')
                         ->groupBy('feedback_answers.answer_text');

        // Apply ranking and limit for open-text demographics like Region
        if ($keyword === 'region') {
            $results->orderByDesc('value')->limit(8);
        }

        return $results->get()->map(function ($item) {
            return [
                'name'  => trim($item->name),
                'value' => (int) $item->value, // Cast to integer for Recharts
            ];
        });
    }

    /**
     * Get Citizen's Charter (CC) Awareness, Visibility, and Helpfulness rates.
     */
    public static function getCcMetrics($range, $departmentId)
    {
        $query = DB::table('feedback_answers')
            ->join('feedback', 'feedback_answers.response_id', '=', 'feedback.response_id')
            ->join('form_fields', 'feedback_answers.field_id', '=', 'form_fields.field_id')
            ->join('forms', 'feedback.form_id', '=', 'forms.form_id')
            ->where('form_fields.field_label', 'LIKE', '%CC%')
            ->select('form_fields.field_label', 'feedback_answers.answer_text');

        if ($departmentId !== 'overall') {
            $query->where('forms.department_id', $departmentId);
        }

        self::applyDateFilter($query, 'feedback.submitted_at', $range);
        $rows = $query->get();

        $cc1Total = 0; $cc1Aware = 0;
        $cc2Total = 0; $cc2Visible = 0;
        $cc3Total = 0; $cc3Helpful = 0;

        foreach ($rows as $row) {
            $label = $row->field_label;
            $ans = strtolower(trim($row->answer_text));

            if (stripos($label, 'CC1') !== false) {
                $cc1Total++;
                if (preg_match('/^[1-3]/', $ans) || stripos($ans, 'know') !== false || stripos($ans, 'learned') !== false) {
                    if (stripos($ans, 'do not know') === false) {
                        $cc1Aware++;
                    }
                }
            }

            if (stripos($label, 'CC2') !== false && $ans !== 'n/a' && $ans !== '5. n/a') {
                $cc2Total++;
                if (stripos($ans, 'easy to see') !== false) {
                    $cc2Visible++;
                }
            }

            if (stripos($label, 'CC3') !== false && $ans !== 'n/a' && $ans !== '5. n/a') {
                $cc3Total++;
                if (stripos($ans, 'helped') !== false && stripos($ans, 'did not help') === false) {
                    $cc3Helpful++;
                }
            }
        }

        return [
            'awareness_rate'   => $cc1Total > 0 ? round(($cc1Aware / $cc1Total) * 100) : 0,
            'visibility_rate'  => $cc2Total > 0 ? round(($cc2Visible / $cc2Total) * 100) : 0,
            'helpfulness_rate' => $cc3Total > 0 ? round(($cc3Helpful / $cc3Total) * 100) : 0,
            'total_responses'  => max($cc1Total, $cc2Total, $cc3Total),
        ];
    }

    /**
     * Get top recurring complaint terms strictly from negative/mixed sentiment comments.
     */
    public static function getTopRecurringWords($range, $departmentId)
    {
        $query = DB::table('feedback_answers')
            ->join('feedback', 'feedback_answers.response_id', '=', 'feedback.response_id')
            ->join('form_fields', 'feedback_answers.field_id', '=', 'form_fields.field_id')
            ->join('forms', 'feedback.form_id', '=', 'forms.form_id')
            ->join('sentiment_analysis', 'feedback.response_id', '=', 'sentiment_analysis.response_id')
            ->whereIn('form_fields.input_type', ['textarea', 'text'])
            ->where('form_fields.field_label', 'NOT LIKE', '%Sex%')
            ->where('form_fields.field_label', 'NOT LIKE', '%Client%')
            ->where('form_fields.field_label', 'NOT LIKE', '%Transaction%')
            ->where('form_fields.field_label', 'NOT LIKE', '%CC%')
            ->where('form_fields.field_label', 'NOT LIKE', '%SQD%')
            ->where('form_fields.field_label', 'NOT LIKE', '%Age%')
            ->where('form_fields.field_label', 'NOT LIKE', '%Region%')
            ->whereIn('sentiment_analysis.sentiment', ['Negative', 'Mixed']);

        if ($departmentId !== 'overall') {
            $query->where('forms.department_id', $departmentId);
        }

        self::applyDateFilter($query, 'feedback.submitted_at', $range);

        $answers = $query->pluck('feedback_answers.answer_text');

        $stopwords = [
            'ang', 'ng', 'sa', 'mga', 'na', 'at', 'po', 'opo', 'ay', 'ko', 'mo', 'ni', 
            'kami', 'namin', 'sila', 'nila', 'ito', 'iyon', 'yan', 'yon', 'para', 'pero', 
            'the', 'and', 'is', 'in', 'to', 'of', 'for', 'it', 'on', 'with', 'as', 'at', 
            'was', 'by', 'an', 'be', 'this', 'that', 'from', 'n/a', 'none', 'wala', 'hindi',
            'student', 'citizen', 'internal', 'external', 'male', 'female', 'yes', 'no'
        ];

        $wordCounts = [];

        foreach ($answers as $text) {
            if (empty($text) || is_numeric($text)) continue;

            $cleanText = preg_replace('/[^\p{L}\p{N}\s]/u', '', mb_strtolower($text));
            $words = preg_split('/\s+/', $cleanText, -1, PREG_SPLIT_NO_EMPTY);

            foreach ($words as $word) {
                if (mb_strlen($word) < 4 || in_array($word, $stopwords)) continue;
                $wordCounts[$word] = ($wordCounts[$word] ?? 0) + 1;
            }
        }
        $recurringCounts = array_filter($wordCounts, function ($count) {
            return $count >= 2;
        });
        arsort($recurringCounts);

        $result = [];
        foreach (array_slice($recurringCounts, 0, 8, true) as $word => $count) {
            $result[] = ['word' => ucfirst($word), 'count' => $count];
        }

        return $result;
    }
}