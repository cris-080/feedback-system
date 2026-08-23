<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon; // Required for date range calculations

class Feedback extends Model
{
    protected $table = 'feedback';
    protected $primaryKey = 'response_id';
    public $timestamps = false; 

    /**
     * Process and store the submitted feedback, answers, and AI sentiment in a secure transaction.
     */
    public static function processSubmission(array $validated)
    {
        DB::transaction(function () use ($validated) {
            // A. Fetch QR ID
            $qrRecord = DB::table('qr_code')
                ->select('qr_id')
                ->where('department_id', $validated['department_id'])
                ->first();
            $qrId = $qrRecord ? $qrRecord->qr_id : 1;

            // B. Generate Control Number
            $controlNumber = 'CTRL-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -5));

            // C. Insert Parent Feedback Record
            $responseId = DB::table('feedback')->insertGetId([
                'control_number' => $controlNumber,
                'email_address'  => $validated['email_address'],
                'submitted_at'   => now(),
                'qr_id'          => $qrId,
                'form_id'        => $validated['form_id'],
                'status'         => 'Valid',
            ]);

            // D. Insert AI Sentiment Analysis into its dedicated table matching your schema
            DB::table('sentiment_analysis')->insert([
                'response_id'      => $responseId,
                'sentiment'        => $validated['sentiment'] ?? 'Uncategorized',
                'confidence_score' => isset($validated['ai_confidence']) ? ($validated['ai_confidence'] / 100) : 0,
                'analyzed_at'      => now(),
            ]);

            // E. Insert Answers
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
     * Get harassment alert count based on a dynamic question search.
     */
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
     * Get trend data formatted for Recharts.
     */
    public static function getTrendData($range, $departmentId)
    {
        // Added custom_date so specific dates group hourly/daily instead of monthly
        $isDaily = in_array($range, ['today', 'week', 'custom_date']);
        $dateFormat = $isDaily ? '%b %d' : '%b';
        $groupByFormat = $isDaily ? 'DATE(feedback.submitted_at)' : 'MONTH(feedback.submitted_at)';

        $query = DB::table('sentiment_analysis')
            ->join('feedback', 'sentiment_analysis.response_id', '=', 'feedback.response_id')
            ->join('forms', 'feedback.form_id', '=', 'forms.form_id')
            ->select(
                DB::raw("DATE_FORMAT(feedback.submitted_at, '{$dateFormat}') as time_label"),
                DB::raw("{$groupByFormat} as time_group"),
                'sentiment_analysis.sentiment',
                DB::raw('COUNT(*) as total')
            );

        if ($departmentId !== 'overall') {
            $query->where('forms.department_id', $departmentId);
        }

        self::applyDateFilter($query, 'feedback.submitted_at', $range);

        $rawTrends = $query->groupBy('time_group', 'time_label', 'sentiment_analysis.sentiment')
                           ->orderBy('time_group')
                           ->get();

        $formatted = [];
        foreach ($rawTrends as $row) {
            $label = $row->time_label;
            if (!isset($formatted[$label])) {
                $formatted[$label] = ['month' => $label, 'Positive' => 0, 'Negative' => 0, 'Neutral' => 0, 'Mixed' => 0];
            }
            $formatted[$label][$row->sentiment] = (int) $row->total;
        }

        return array_values($formatted);
    }

    /**
     * Get sentiment scores aggregated by department for bar charts.
     */
    public static function getDepartmentScores($range)
    {
        $query = DB::table('sentiment_analysis')
            ->join('feedback', 'sentiment_analysis.response_id', '=', 'feedback.response_id')
            ->join('forms', 'feedback.form_id', '=', 'forms.form_id')
            ->join('department', 'forms.department_id', '=', 'department.department_id')
            ->select(
                'department.department_id',
                'department.department_name as name',
                DB::raw('SUM(CASE WHEN sentiment_analysis.sentiment = "Positive" THEN 1 ELSE 0 END) as pos_count'),
                DB::raw('COUNT(*) as total_count')
            );

        self::applyDateFilter($query, 'feedback.submitted_at', $range);
        
        $raw = $query->groupBy('department.department_id', 'department.department_name')->get();

        $scores = [];
        foreach ($raw as $item) {
            $score = $item->total_count > 0 ? round(($item->pos_count / $item->total_count) * 100) : 0;
            // Shorten names for cleaner chart axes
            $shortName = str_replace(['Department of ', 'Office of '], '', $item->name);
            $scores[] = ['name' => $shortName, 'score' => $score];
        }

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

            // Detect numeric score (e.g., "5", "5 - Strongly Agree") or pure text
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
     * Resilient Demographics query
     */
    public static function getDemographics($range, $departmentId, $searchKeyword)
    {
        $query = DB::table('feedback_answers')
            ->join('feedback', 'feedback_answers.response_id', '=', 'feedback.response_id')
            ->join('form_fields', 'feedback_answers.field_id', '=', 'form_fields.field_id')
            ->join('forms', 'feedback.form_id', '=', 'forms.form_id')
            ->where('form_fields.field_label', 'LIKE', '%' . $searchKeyword . '%')
            ->select('feedback_answers.answer_text as name', DB::raw('COUNT(*) as value'));

        if ($departmentId !== 'overall') {
            $query->where('forms.department_id', $departmentId);
        }

        self::applyDateFilter($query, 'feedback.submitted_at', $range);

        return $query->whereNotNull('feedback_answers.answer_text')
                     ->where('feedback_answers.answer_text', '!=', '')
                     ->groupBy('feedback_answers.answer_text')
                     ->get();
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

            // CC1: Awareness
            if (stripos($label, 'CC1') !== false) {
                $cc1Total++;
                if (preg_match('/^[1-3]/', $ans) || stripos($ans, 'know') !== false || stripos($ans, 'learned') !== false) {
                    if (stripos($ans, 'do not know') === false) {
                        $cc1Aware++;
                    }
                }
            }

            // CC2: Visibility
            if (stripos($label, 'CC2') !== false && $ans !== 'n/a' && $ans !== '5. n/a') {
                $cc2Total++;
                if (stripos($ans, 'easy to see') !== false) {
                    $cc2Visible++;
                }
            }

            // CC3: Helpfulness
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
     * Extract Top Recurring Words from open-ended feedback text.
     * Only includes words that appear at least $minOccurrences times.
     */
    public static function getTopRecurringWords($range, $departmentId, $limit = 10, $minOccurrences = 2)
    {
        $query = DB::table('feedback_answers')
            ->join('feedback', 'feedback_answers.response_id', '=', 'feedback.response_id')
            ->join('form_fields', 'feedback_answers.field_id', '=', 'form_fields.field_id')
            ->join('forms', 'feedback.form_id', '=', 'forms.form_id')
            ->where('form_fields.field_label', 'LIKE', '%Suggestions%')
            ->select('feedback_answers.answer_text');

        if ($departmentId !== 'overall') {
            $query->where('forms.department_id', $departmentId);
        }

        self::applyDateFilter($query, 'feedback.submitted_at', $range);

        $answers = $query->pluck('answer_text');

        // Common English and Tagalog stop words to filter out
        $stopWords = [
            'the', 'and', 'is', 'in', 'it', 'of', 'to', 'for', 'on', 'with', 'at', 'by', 'from', 'this', 'that', 'an', 'be', 'are', 'was', 'as', 'or', 'so',
            'ang', 'mga', 'sa', 'na', 'ng', 'po', 'ko', 'mo', 'ni', 'kay', 'si', 'ay', 'at', 'pa', 'din', 'rin', 'ito', 'yan', 'yun', 'ung', 'nang', 'dahil',
            'para', 'kami', 'tayo', 'sila', 'nila', 'namin', 'natin', 'lahat', 'mas', 'pero', 'kasi', 'ung', 'yung', 'kung', 'naka', 'ba', 'naman', 'ninyo',
            'na', 'n/a', 'none', 'wala', 'no', 'sir', 'maam', 'pls', 'please'
        ];

        $wordCounts = [];

        foreach ($answers as $text) {
            if (empty($text)) continue;

            // Remove special characters, punctuation, and split by whitespace
            $clean = preg_replace('/[^\p{L}\p{N}\s]/u', ' ', mb_strtolower($text));
            $words = preg_split('/\s+/', $clean, -1, PREG_SPLIT_NO_EMPTY);

            // Deduplicate per single response so one user spamming a word doesn't skew count
            $uniqueWordsInSubmission = array_unique($words);

            foreach ($uniqueWordsInSubmission as $word) {
                if (mb_strlen($word) < 3 || in_array($word, $stopWords)) {
                    continue;
                }
                $wordCounts[$word] = ($wordCounts[$word] ?? 0) + 1;
            }
        }

        // Filter out words that appear fewer times than the minimum threshold
        $recurringWords = array_filter($wordCounts, function ($count) use ($minOccurrences) {
            return $count >= $minOccurrences;
        });

        arsort($recurringWords);

        $formatted = [];
        foreach (array_slice($recurringWords, 0, $limit) as $word => $count) {
            $formatted[] = ['word' => ucfirst($word), 'count' => $count];
        }

        return $formatted;
    }
}