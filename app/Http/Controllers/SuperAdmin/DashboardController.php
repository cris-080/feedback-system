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
        $specificDate = $request->query('specific_date') ?? $request->get('specific_date');
        $specificMonth = $request->query('specific_month') ?? $request->get('specific_month');
        $autoFallbackMessage = null;
        
        if ($isSuperGroup) {
            // SuperAdmins and Feedback Committee can filter by any department or view 'overall'
            $selectedDepartment = $request->query('department', 'overall');
        } else {
            // Focal Person is STRICTLY locked to their own department
            $selectedDepartment = $departmentId;
        }

        // --- AUTO-FALLBACK LOGIC FOR FEEDBACK COMMITTEE ---
        if ($isFeedbackCommittee && $range === 'month' && empty($specificDate) && empty($specificMonth)) {
            $now = Carbon::now();
            $mStart = $now->copy()->startOfMonth()->toDateString();
            $mEnd   = $now->copy()->endOfMonth()->toDateString();

            // Strictly check if there are reports COVERING the current month
            $hasCurrentReports = DB::table('reports')
                ->whereIn('status', ['Submitted', 'Approved'])
                ->whereDate('start_date', '<=', $mEnd)
                ->whereDate('end_date', '>=', $mStart);
                
            if (Schema::hasColumn('reports', 'deleted_at')) {
                $hasCurrentReports->whereNull('deleted_at');
            }
            $hasCurrentReports->where(function ($q) {
                $q->whereNull('report_data->metadata->is_deleted')
                  ->orWhere('report_data->metadata->is_deleted', false);
            });

            if ($selectedDepartment !== 'overall') {
                $hasCurrentReports->where('department_id', $selectedDepartment);
            }

            if (!$hasCurrentReports->exists()) {
                $latestReport = DB::table('reports')->whereIn('status', ['Submitted', 'Approved']);
                
                if (Schema::hasColumn('reports', 'deleted_at')) {
                    $latestReport->whereNull('deleted_at');
                }
                $latestReport->where(function ($q) {
                    $q->whereNull('report_data->metadata->is_deleted')
                      ->orWhere('report_data->metadata->is_deleted', false);
                });
                    
                if ($selectedDepartment !== 'overall') {
                    $latestReport->where('department_id', $selectedDepartment);
                }
                
             
                $latest = $latestReport->orderBy('created_at', 'desc')->first(['end_date', 'created_at']);

                if ($latest) {
                    // CRITICAL FIX: Use the creation/submission date instead of the coverage end date 
                    // so it accurately jumps to the month the Focal Person actually submitted it.
                    $fallbackDate = Carbon::parse($latest->created_at);
                    $range = 'custom_month';
                    $specificMonth = $fallbackDate->format('Y-m');
                    $autoFallbackMessage = "No submissions found for " . $now->format('F Y') . ". Automatically displaying the latest reports submitted in " . $fallbackDate->format('F Y') . ".";
                }
            }
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


        // 5. Assemble Core Metrics First
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
            'specific_date'       => $specificDate,
            'specific_month'      => $specificMonth,
            'fallback_message'    => $autoFallbackMessage,

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
            
            'recommendation_data' => $recommendationData,
            'harassment_words'    => $harassmentWords,
        ];

       // 6. Feedback Committee Strict Audit Override
        if ($isFeedbackCommittee) {
            $reportQuery = DB::table('reports')->whereIn('status', ['Submitted', 'Approved']);

            if (Schema::hasColumn('reports', 'deleted_at')) {
                $reportQuery->whereNull('deleted_at');
            }
            $reportQuery->where(function ($q) {
                $q->whereNull('report_data->metadata->is_deleted')
                  ->orWhere('report_data->metadata->is_deleted', false);
            });

            if ($selectedDepartment !== 'overall') {
                $reportQuery->where('department_id', $selectedDepartment);
            }

           // Match strictly by the covered period (start_date..end_date)
            $now = Carbon::now();
            $applyWindowFilter = function ($q, $startStr, $endStr) {
                $q->whereDate('start_date', '<=', $endStr)
                  ->whereDate('end_date', '>=', $startStr);
            };

            if ($range === 'today') {
                $todayStr = $now->toDateString();
                $applyWindowFilter($reportQuery, $todayStr, $todayStr);
            } elseif ($range === 'week') {
                $applyWindowFilter(
                    $reportQuery,
                    $now->copy()->startOfWeek()->toDateString(),
                    $now->copy()->endOfWeek()->toDateString()
                );
            } elseif ($range === 'month') {
                $applyWindowFilter(
                    $reportQuery,
                    $now->copy()->startOfMonth()->toDateString(),
                    $now->copy()->endOfMonth()->toDateString()
                );
            } elseif ($range === 'year') {
                $applyWindowFilter(
                    $reportQuery,
                    $now->copy()->startOfYear()->toDateString(),
                    $now->copy()->endOfYear()->toDateString()
                );
            } elseif ($range === 'custom_date' && !empty($specificDate)) {
                $applyWindowFilter($reportQuery, $specificDate, $specificDate);
            } elseif ($range === 'custom_month' && !empty($specificMonth)) {
                try {
                    $parsedMonth = Carbon::parse($specificMonth . '-01');
                    $applyWindowFilter(
                        $reportQuery,
                        $parsedMonth->copy()->startOfMonth()->toDateString(),
                        $parsedMonth->copy()->endOfMonth()->toDateString()
                    );
                } catch (\Throwable $e) {}
            }

            $fcReports = $reportQuery->get(['id', 'department_id', 'start_date', 'end_date', 'report_data']);

            $totalAudited = 0;
            $totalHarassment = 0;
            $compliantDeptIds = [];
            $auditedIds = [];

            $aggClient = []; $aggSex = []; $aggTrans = []; $aggRec = []; $aggRegion = [];
            $aggSqd = []; $ccAware = 0; $ccVis = 0; $ccHelp = 0; $ccTotal = 0;
            $deptStatsMap = [];

            foreach ($fcReports as $r) {
                $data = json_decode($r->report_data, true);
                if (!$data) continue;

                $deptId = $r->department_id;
                $compliantDeptIds[] = $deptId;

                $reportRespCount = (int) ($data['metadata']['total_respondents'] ?? 0);
                $totalAudited += $reportRespCount;
                $totalHarassment += (int) ($data['harassment']['Yes']['count'] ?? 0);

                // Extract exact feedback IDs belonging to this submitted report's department and date range
                if (!empty($data['feedbacks_logged']) && is_array($data['feedbacks_logged'])) {
                    $reportFeedbackIds = $data['feedbacks_logged'];
                } else {
                    $fbQuery = DB::table('feedback')
                        ->join('forms', 'feedback.form_id', '=', 'forms.form_id')
                        ->whereDate('feedback.submitted_at', '>=', $r->start_date)
                        ->whereDate('feedback.submitted_at', '<=', $r->end_date);
                    if ($deptId) {
                        $fbQuery->where('forms.department_id', $deptId);
                    }
                    $reportFeedbackIds = $fbQuery->pluck('feedback.response_id')->toArray();
                }
                $auditedIds = array_merge($auditedIds, $reportFeedbackIds);

                // Track per-department totals for Office Performance Benchmark
                if ($deptId) {
                    if (!isset($deptStatsMap[$deptId])) {
                        $deptStatsMap[$deptId] = ['total' => 0, 'positive' => 0, 'feedback_ids' => []];
                    }
                    $deptStatsMap[$deptId]['total'] += $reportRespCount;
                    $deptStatsMap[$deptId]['feedback_ids'] = array_merge($deptStatsMap[$deptId]['feedback_ids'], $reportFeedbackIds);
                }

                // Aggregate Demographics from JSON Snapshot
                if (isset($data['demographics'])) {
                    $demos = $data['demographics'];

                    $clientData = $demos['client_type'] ?? $demos['client'] ?? $demos['Client Classification'] ?? [];
                    foreach ($clientData as $name => $stats) { $aggClient[$name] = ($aggClient[$name] ?? 0) + ($stats['count'] ?? 0); }

                    $sexData = $demos['sex'] ?? $demos['Sex'] ?? [];
                    foreach ($sexData as $name => $stats) { $aggSex[$name] = ($aggSex[$name] ?? 0) + ($stats['count'] ?? 0); }

                    $transData = $demos['transaction_type'] ?? $demos['transaction'] ?? $demos['Transaction Type'] ?? [];
                    foreach ($transData as $name => $stats) { $aggTrans[$name] = ($aggTrans[$name] ?? 0) + ($stats['count'] ?? 0); }

                    $regData = $demos['region'] ?? $demos['Region'] ?? [];
                    foreach ($regData as $name => $stats) { $aggRegion[$name] = ($aggRegion[$name] ?? 0) + ($stats['count'] ?? 0); }
                }

                if (isset($data['recommendations'])) {
                    foreach ($data['recommendations'] as $name => $stats) {
                        $aggRec[$name] = ($aggRec[$name] ?? 0) + ($stats['count'] ?? 0);
                    }
                }

                // Aggregate CC Metrics from JSON Snapshot
                if (isset($data['cc_formulas'])) {
                    $localCcTotal = max(
                        array_sum(array_column($data['cc_metrics']['cc1'] ?? [], 'count')),
                        array_sum(array_column($data['cc_metrics']['cc2'] ?? [], 'count')),
                        array_sum(array_column($data['cc_metrics']['cc3'] ?? [], 'count'))
                    );
                    if ($localCcTotal === 0) {
                        $localCcTotal = $reportRespCount;
                    }
                    $ccTotal += $localCcTotal;
                    $ccAware += round(($data['cc_formulas']['cc1_aware'] ?? 0) / 100 * $localCcTotal);
                    $ccVis += round(($data['cc_formulas']['cc2_visible'] ?? 0) / 100 * $localCcTotal);
                    $ccHelp += round(($data['cc_formulas']['cc3_helpful'] ?? 0) / 100 * $localCcTotal);
                }

                // Aggregate SQD Scores from JSON Snapshot
                if (isset($data['sqd_metrics'])) {
                    $sqdSource = isset($data['sqd_metrics']['overall']) ? $data['sqd_metrics']['overall'] : $data['sqd_metrics'];
                    for ($i = 0; $i <= 8; $i++) {
                        $key = 'sqd' . $i;
                        if (isset($sqdSource[$key]['counts'])) {
                            if (!isset($aggSqd[$key])) {
                                $sqdNames = ['Satisfaction', 'Time', 'Requirements', 'Simplicity', 'Information', 'Fees', 'Fairness', 'Courtesy', 'Outcome'];
                                $aggSqd[$key] = ['name' => strtoupper($key) . ': ' . $sqdNames[$i], '5' => 0, '4' => 0, '3' => 0, '2' => 0, '1' => 0];
                            }
                            foreach (['5', '4', '3', '2', '1'] as $score) {
                                $aggSqd[$key][$score] += (int) ($sqdSource[$key]['counts'][$score] ?? 0);
                            }
                        }
                    }
                }
            }

            $auditedIds = array_values(array_unique($auditedIds));
            $hasReports = $fcReports->isNotEmpty();

            $formatDemo = function($arr) {
                $res = [];
                foreach ($arr as $name => $val) { if ($val > 0) $res[] = ['name' => $name, 'value' => (int) $val]; }
                return $res;
            };

            // Fallback to database using exact $auditedIds if Transaction Type wasn't in JSON
            if ($hasReports && empty($aggTrans) && !empty($auditedIds)) {
                $dbTrans = DB::table('feedback_answers')
                    ->join('form_fields', 'feedback_answers.field_id', '=', 'form_fields.field_id')
                    ->whereIn('feedback_answers.response_id', $auditedIds)
                    ->where(function ($q) {
                        $q->where('form_fields.field_label', 'LIKE', '%Transaction Type%')
                          ->orWhere('form_fields.field_label', 'LIKE', '%Transaction%');
                    })
                    ->whereIn('feedback_answers.answer_text', ['Internal', 'External'])
                    ->select('feedback_answers.answer_text as name', DB::raw('COUNT(DISTINCT feedback_answers.response_id) as value'))
                    ->groupBy('feedback_answers.answer_text')
                    ->get();
                foreach ($dbTrans as $t) { $aggTrans[trim($t->name)] = (int) $t->value; }
            }

            // Build Office Performance Benchmark strictly for compliant departments and their audited IDs
            $fcDeptScores = [];
            if ($hasReports && !empty($deptStatsMap)) {
                $depts = DB::table('department')->whereIn('department_id', array_keys($deptStatsMap))->get();
                foreach ($depts as $dept) {
                    $dStats = $deptStatsMap[$dept->department_id];
                    $deptFbIds = array_values(array_unique($dStats['feedback_ids']));
                    $total = count($deptFbIds) > 0 ? count($deptFbIds) : $dStats['total'];

                    if ($total > 0) {
                        $positiveCount = 0;
                        if (!empty($deptFbIds)) {
                            $positiveCount = DB::table('sentiment_analysis')
                                ->whereIn('response_id', $deptFbIds)
                                ->whereIn('sentiment', ['Positive', 'Neutral'])
                                ->count();
                        }

                        $fcDeptScores[] = [
                            'department_id' => $dept->department_id,
                            'name'          => str_replace(['Department of ', 'Office of ', 'College of '], '', $dept->department_name),
                            'full_name'     => $dept->department_name,
                            'score'         => round(($positiveCount / $total) * 100),
                            'total'         => $total,
                        ];
                    }
                }
                usort($fcDeptScores, fn($a, $b) => $b['score'] <=> $a['score']);
            }

           // Build Sentiment Trend directly from the exact $auditedIds dates so it works across any month
            $fcTrendData = [];
            if ($hasReports && !empty($auditedIds)) {
                
                // Build a timeline skeleton so the chart stretches across the full reported period
                $trendMap = [];
                $minDate = null;
                $maxDate = null;
                foreach ($fcReports as $r) {
                    if (!$minDate || $r->start_date < $minDate) $minDate = $r->start_date;
                    if (!$maxDate || $r->end_date > $maxDate) $maxDate = $r->end_date;
                }
                
                if ($minDate && $maxDate) {
                    $start = Carbon::parse($minDate);
                    $end = Carbon::parse($maxDate);
                    while ($start <= $end) {
                        $lbl = $start->format('M d');
                        $trendMap[$lbl] = ['month' => $lbl, 'Positive' => 0, 'Negative' => 0, 'Neutral' => 0, 'Mixed' => 0];
                        $start->addDay();
                    }
                }

                $rawTrendRows = DB::table('sentiment_analysis')
                    ->join('feedback', 'sentiment_analysis.response_id', '=', 'feedback.response_id')
                    ->whereIn('feedback.response_id', $auditedIds)
                    ->select(
                        DB::raw("DATE_FORMAT(feedback.submitted_at, '%Y-%m-%d') as raw_date"),
                        DB::raw("DATE_FORMAT(feedback.submitted_at, '%b %d') as label"),
                        'sentiment_analysis.sentiment',
                        DB::raw('COUNT(*) as total')
                    )
                    ->groupBy('raw_date', 'label', 'sentiment_analysis.sentiment')
                    ->orderBy('raw_date', 'asc')
                    ->get();

                foreach ($rawTrendRows as $row) {
                    $lbl = $row->label;
                    if (!isset($trendMap[$lbl])) {
                        $trendMap[$lbl] = ['month' => $lbl, 'Positive' => 0, 'Negative' => 0, 'Neutral' => 0, 'Mixed' => 0];
                    }
                    if (isset($trendMap[$lbl][$row->sentiment])) {
                        $trendMap[$lbl][$row->sentiment] += (int) $row->total;
                    }
                }
                $fcTrendData = array_values($trendMap);
            }

            Feedback::$auditedIdsOverride = $hasReports && !empty($auditedIds) ? $auditedIds : [0];
            $fcTopWords = $hasReports ? Feedback::getTopRecurringWords($range, $selectedDepartment) : [];
            Feedback::$auditedIdsOverride = null;

            $fcServices = [];
            $fcProviders = [];
            $fcHarassmentWords = [];

            if ($hasReports && !empty($auditedIds)) {
                $fcServices = DB::table('feedback_answers as fa')
                    ->join('form_fields as ff', 'fa.field_id', '=', 'ff.field_id')
                    ->leftJoin('sentiment_analysis as sa', 'fa.response_id', '=', 'sa.response_id')
                    ->join('feedback as f', 'fa.response_id', '=', 'f.response_id')
                    ->join('forms as frm', 'f.form_id', '=', 'frm.form_id')
                    ->leftJoin('department as d', 'frm.department_id', '=', 'd.department_id')
                    ->whereIn('f.response_id', $auditedIds)
                    ->where('ff.field_label', 'LIKE', '%Service Availed%')
                    ->whereNotNull('fa.answer_text')
                    ->where('fa.answer_text', '!=', '')
                    ->select(
                        'fa.answer_text as name',
                        DB::raw('COALESCE(d.department_name, "General") as department_name'),
                        DB::raw('COUNT(fa.response_id) as total'),
                        DB::raw('COALESCE(ROUND(AVG(sa.confidence_score), 0), 0) as score')
                    )
                    ->groupBy('fa.answer_text', 'd.department_name')
                    ->orderByDesc('total')
                    ->limit(10)
                    ->get();

                $fcProviders = DB::table('feedback_answers as fa')
                    ->join('form_fields as ff', 'fa.field_id', '=', 'ff.field_id')
                    ->leftJoin('sentiment_analysis as sa', 'fa.response_id', '=', 'sa.response_id')
                    ->join('feedback as f', 'fa.response_id', '=', 'f.response_id')
                    ->join('forms as frm', 'f.form_id', '=', 'frm.form_id')
                    ->leftJoin('department as d', 'frm.department_id', '=', 'd.department_id')
                    ->whereIn('f.response_id', $auditedIds)
                    ->where('ff.field_label', 'LIKE', '%Name of Service Provider%')
                    ->whereNotNull('fa.answer_text')
                    ->where('fa.answer_text', '!=', '')
                    ->select(
                        'fa.answer_text as name',
                        DB::raw('COALESCE(d.department_name, "General") as department_name'),
                        DB::raw('COUNT(fa.response_id) as total'),
                        DB::raw('COALESCE(ROUND(AVG(sa.confidence_score), 0), 0) as score')
                    )
                    ->groupBy('fa.answer_text', 'd.department_name')
                    ->orderByDesc('total')
                    ->limit(10)
                    ->get();
            }

            arsort($aggRegion);
            $fcRegions = [];
            foreach (array_slice($aggRegion, 0, 8, true) as $rName => $rVal) {
                if ($rVal > 0) $fcRegions[] = ['name' => $rName, 'value' => (int) $rVal];
            }

            $metrics['total_audited_feedback'] = $totalAudited;
            $metrics['audited_harassment']     = $totalHarassment;
            $metrics['compliant_departments']  = count(array_unique($compliantDeptIds));
            $metrics['pending_reports']        = DB::table('reports')->where('status', 'Submitted')->count();

            $metrics['trendData']            = $fcTrendData;
            $metrics['department_scores']    = $fcDeptScores;
            $metrics['sqd_data']             = $hasReports ? array_values($aggSqd) : [];
            $metrics['client_types']         = $hasReports ? $formatDemo($aggClient) : [];
            $metrics['sex_demographics']     = $hasReports ? $formatDemo($aggSex) : [];
            $metrics['transaction_types']    = $hasReports ? $formatDemo($aggTrans) : [];
            $metrics['recommendation_data']  = $hasReports ? $formatDemo($aggRec) : [];
            $metrics['region_demographics']  = $fcRegions;
            $metrics['service_performance']  = $fcServices;
            $metrics['provider_performance'] = $fcProviders;
            $metrics['top_words']            = $fcTopWords;
            $metrics['harassment_words']     = $fcHarassmentWords;

            if ($hasReports && $ccTotal > 0) {
                $metrics['cc_metrics'] = [
                    'awareness_rate'   => round(($ccAware / $ccTotal) * 100),
                    'visibility_rate'  => round(($ccVis / $ccTotal) * 100),
                    'helpfulness_rate' => round(($ccHelp / $ccTotal) * 100),
                    'total_responses'  => $ccTotal
                ];
            } else {
                $metrics['cc_metrics'] = [
                    'awareness_rate' => 0, 'visibility_rate' => 0, 'helpfulness_rate' => 0, 'total_responses' => 0
                ];
            }
        }

        // 7. Return View

        return Inertia::render('SuperAdmin/Dashboard', [
            'metrics'        => $metrics,
            'recentAccounts' => $isSuperAdmin ? Account::getRecentAccounts(5) : [],
            'recentForms'    => $isSuperAdmin ? Form::getRecentFormsWithDepartment(5) : [],
            'isSuperAdmin'   => $isSuperAdmin,
            'deploymentData' => $deploymentData
        ]);
    }
}