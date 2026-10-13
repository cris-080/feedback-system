<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Account;
use App\Models\Department;
use App\Models\Form;
use App\Models\Feedback;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Carbon\Carbon;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();
        $rawRole = strtolower(trim($user->role ?? ''));
        
        // Define strict roles
        $isSuperAdmin = $rawRole === 'superadmin';
        $isFeedbackCommittee = $rawRole === 'feedback committee' || $rawRole === 'feedbackcommittee';
        
        // The SuperGroup can view data across all departments
        $isSuperGroup = $isSuperAdmin || $isFeedbackCommittee;
        
        $departmentId = $user->department_id;

        // 1. Capture Request Parameters & Enforce RBAC
        $range = $request->query('range', 'month');
        
        if ($isSuperGroup) {
            // SuperAdmins and Feedback Committee can filter by any department or view 'overall'
            $selectedDepartment = $request->query('department', 'overall');
        } else {
            // Focal Person is STRICTLY locked to their own department
            $selectedDepartment = $departmentId;
        }

        // 2. Fetch necessary base data
        $departments = Department::select('department_id', 'department_name', 'classification')->get();

        // 3. Focal Person Extras (Deployment Kit)
        $deploymentData = null;
        $activeForm = null;

        if (!$isSuperGroup && $departmentId) {
            $activeForm = Form::getActiveFormByDepartment($departmentId);
            
            if ($activeForm) {
                $secureToken = Crypt::encryptString($activeForm->form_id);
                $baseUrl = url('/feedback?token=' . $secureToken);
                
                $deploymentData = [
                    'kiosk_link'   => $baseUrl . '&kiosk=true',
                    'qr_image_url' => 'https://quickchart.io/qr?text=' . urlencode($baseUrl) . '&size=300&margin=2'
                ];
            }
        }

       // 4. Shared Date-Range Filter for Dashboard Queries (Syncs with monthly reset & filter dropdown)
        $dateColumn = Schema::hasColumn('feedback', 'created_at') ? 'f.created_at' : 'f.submitted_at';
        $specificDate = $request->get('specific_date');
        $specificMonth = $request->get('specific_month');

        $applyDateFilter = function ($query) use ($range, $specificDate, $specificMonth, $dateColumn) {
            $now = Carbon::now();

            if ($range === 'today') {
                $query->whereDate($dateColumn, $now->toDateString());
            } elseif ($range === 'week') {
                $query->whereBetween($dateColumn, [
                    $now->copy()->startOfWeek()->startOfDay(),
                    $now->copy()->endOfWeek()->endOfDay(),
                ]);
            } elseif ($range === 'month') {
                $query->whereYear($dateColumn, $now->year)
                      ->whereMonth($dateColumn, $now->month);
            } elseif ($range === 'year') {
                $query->whereYear($dateColumn, $now->year);
            } elseif ($range === 'custom_date' && !empty($specificDate)) {
                $query->whereDate($dateColumn, $specificDate);
            } elseif ($range === 'custom_month' && !empty($specificMonth)) {
                try {
                    $parsedMonth = Carbon::parse($specificMonth . '-01');
                    $query->whereYear($dateColumn, $parsedMonth->year)
                          ->whereMonth($dateColumn, $parsedMonth->month);
                } catch (\Throwable $e) {
                    $query->whereYear($dateColumn, $now->year)
                          ->whereMonth($dateColumn, $now->month);
                }
            }
            // If $range === 'all', no date constraint is applied
        };

        // 4a. Fetch Dynamic Top 10 Most Availed Services
        $serviceQuery = DB::table('feedback_answers as fa')
            ->join('form_fields as ff', 'fa.field_id', '=', 'ff.field_id')
            ->leftJoin('sentiment_analysis as sa', 'fa.response_id', '=', 'sa.response_id')
            ->join('feedback as f', 'fa.response_id', '=', 'f.response_id')
            ->join('forms as frm', 'f.form_id', '=', 'frm.form_id')
            ->leftJoin('department as d', 'frm.department_id', '=', 'd.department_id')
            ->where('ff.field_label', 'LIKE', '%Service Availed%')
            ->whereNotNull('fa.answer_text')
            ->where('fa.answer_text', '!=', '');

        if ($selectedDepartment !== 'overall') {
            $serviceQuery->where('frm.department_id', $selectedDepartment);
        }
        $applyDateFilter($serviceQuery);

        $servicePerformance = $serviceQuery->select(
                'fa.answer_text as name',
                DB::raw('COALESCE(d.department_name, "General") as department_name'),
                DB::raw('COUNT(fa.response_id) as total'),
                DB::raw('COALESCE(ROUND(AVG(sa.confidence_score), 0), 0) as score')
            )
            ->groupBy('fa.answer_text', 'd.department_name')
            ->orderByDesc('total')
            ->limit(10)
            ->get();

        // 4b. Fetch Dynamic Top 10 Service Providers
        $providerQuery = DB::table('feedback_answers as fa')
            ->join('form_fields as ff', 'fa.field_id', '=', 'ff.field_id')
            ->leftJoin('sentiment_analysis as sa', 'fa.response_id', '=', 'sa.response_id')
            ->join('feedback as f', 'fa.response_id', '=', 'f.response_id')
            ->join('forms as frm', 'f.form_id', '=', 'frm.form_id')
            ->leftJoin('department as d', 'frm.department_id', '=', 'd.department_id')
            ->where('ff.field_label', 'LIKE', '%Name of Service Provider%')
            ->whereNotNull('fa.answer_text')
            ->where('fa.answer_text', '!=', '');

        if ($selectedDepartment !== 'overall') {
            $providerQuery->where('frm.department_id', $selectedDepartment);
        }
        $applyDateFilter($providerQuery);

        $providerPerformance = $providerQuery->select(
                'fa.answer_text as name',
                DB::raw('COALESCE(d.department_name, "General") as department_name'),
                DB::raw('COUNT(fa.response_id) as total'),
                DB::raw('COALESCE(ROUND(AVG(sa.confidence_score), 0), 0) as score')
            )
            ->groupBy('fa.answer_text', 'd.department_name')
            ->orderByDesc('total')
            ->limit(10)
            ->get();

        // 4c. Institutional Recommendation Data (Synced with Date Filter)
        $recommendQuery = DB::table('feedback_answers as fa')
            ->join('form_fields as ff', 'fa.field_id', '=', 'ff.field_id')
            ->join('feedback as f', 'fa.response_id', '=', 'f.response_id')
            ->join('forms as frm', 'f.form_id', '=', 'frm.form_id')
            ->where(function($q) {
                $q->where('ff.field_label', 'LIKE', '%recommend CLSU%')
                  ->orWhere('ff.field_label', 'LIKE', '%Overall, I would recommend%');
            })
            ->whereNotNull('fa.answer_text')
            ->where('fa.answer_text', '!=', '');

        if ($selectedDepartment !== 'overall') {
            $recommendQuery->where('frm.department_id', $selectedDepartment);
        }
        $applyDateFilter($recommendQuery);

        $recommendationData = $recommendQuery->select('fa.answer_text as name', DB::raw('COUNT(fa.response_id) as value'))
            ->groupBy('fa.answer_text')
            ->orderByDesc('value')
            ->get();

        // 4d. Harassment Keyword Text Analysis (Synced with Date Filter)
        $harassmentQuery = DB::table('feedback_answers as fa')
            ->join('form_fields as ff', 'fa.field_id', '=', 'ff.field_id')
            ->join('feedback as f', 'fa.response_id', '=', 'f.response_id')
            ->join('forms as frm', 'f.form_id', '=', 'frm.form_id')
            ->where(function($q) {
                $q->where('ff.field_label', 'LIKE', '%detail the harassment%')
                  ->orWhere('ff.field_label', 'LIKE', '%specify%')
                  ->orWhere('ff.field_label', 'LIKE', '%experienced%');
            })
            ->whereNotNull('fa.answer_text')
            ->where('fa.answer_text', '!=', '')
            ->whereNotIn(DB::raw('LOWER(TRIM(fa.answer_text))'), ['yes', 'no', 'n/a', 'none', 'na']);

        if ($selectedDepartment !== 'overall') {
            $harassmentQuery->where('frm.department_id', $selectedDepartment);
        }
        $applyDateFilter($harassmentQuery);

        // Fetch all raw harassment texts for the active date range
        $harassmentTexts = $harassmentQuery->pluck('fa.answer_text')->toArray();
        
        // Analyze frequency (ignoring common stop words)
        $stopWords = ['the', 'and', 'to', 'a', 'of', 'in', 'i', 'was', 'he', 'she', 'it', 'for', 'on', 'with', 'is', 'that', 'at', 'my', 'me', 'they', 'this', 'but', 'not', 'have', 'had', 'from', 'you', 'are', 'none', 'nothing'];
        $wordCounts = [];
        
        foreach ($harassmentTexts as $text) {
            $words = str_word_count(strtolower($text), 1);
            foreach ($words as $word) {
                if (strlen($word) > 3 && !in_array($word, $stopWords)) {
                    $wordCounts[$word] = ($wordCounts[$word] ?? 0) + 1;
                }
            }
        }
        
        arsort($wordCounts);
        $harassmentWords = [];
        $count = 0;
        foreach ($wordCounts as $word => $freq) {
            if ($count++ >= 10) break; // Limit to top 10 harassment words
            $harassmentWords[] = ['word' => $word, 'count' => $freq];
        }


        // 5. Assemble Metrics
        $metrics = [
            'total_users'         => $isSuperAdmin ? Account::getTotalCount() : 0,
            'total_departments'   => $isSuperGroup ? $departments->count() : 1,
            'active_forms'        => $isSuperGroup ? Form::getActiveCount() : ($activeForm ? 1 : 0),
            
            'departments'         => $isSuperGroup ? $departments : $departments->where('department_id', $departmentId)->values(),

            'total_feedback'      => Feedback::getFilteredCount($range, $selectedDepartment),
            'harassment_reports'  => Feedback::getHarassmentAlerts($range, $selectedDepartment),
            'trends'              => Feedback::getTrends($range, $selectedDepartment),

            'current_range'       => $range,
            'current_department'  => $selectedDepartment,
            'specific_date'       => $request->get('specific_date'),
            'specific_month'      => $request->get('specific_month'),

            'trendData'           => Feedback::getTrendData(in_array($range, ['month', 'all']) ? '90_days' : $range, $selectedDepartment),
            'department_scores'   => Feedback::getDepartmentScores($range),
            'sqd_data'            => Feedback::getSqdData($range, $selectedDepartment),
            
            'client_types'        => Feedback::getDemographics($range, $selectedDepartment, 'Client'),
            'sex_demographics'    => Feedback::getDemographics($range, $selectedDepartment, 'Sex'),
            'transaction_types'   => Feedback::getDemographics($range, $selectedDepartment, 'Transaction'),
            'region_demographics' => Feedback::getDemographics($range, $selectedDepartment, 'Region'),
            'cc_metrics'          => Feedback::getCcMetrics($range, $selectedDepartment),
            'top_words'           => Feedback::getTopRecurringWords($range, $selectedDepartment),
            
            'service_performance' => $servicePerformance,
            'provider_performance'=> $providerPerformance,
            
            // NEW METRICS ADDED HERE
            'recommendation_data' => $recommendationData,
            'harassment_words'    => $harassmentWords
        ];

        // 6. Return View
        return Inertia::render('SuperAdmin/Dashboard', [
            'metrics'        => $metrics,
            'recentAccounts' => $isSuperAdmin ? Account::getRecentAccounts(5) : [],
            'recentForms'    => $isSuperAdmin ? Form::getRecentFormsWithDepartment(5) : [],
            'isSuperAdmin'   => $isSuperAdmin,
            'deploymentData' => $deploymentData
        ]);
    }
}