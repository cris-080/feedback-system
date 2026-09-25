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
        $departments = Department::select('department_id', 'department_name')->get();

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

      // 4. Fetch Dynamic Top 10 Performance Data
        $serviceQuery = DB::table('feedback_answers as fa')
            ->join('form_fields as ff', 'fa.field_id', '=', 'ff.field_id')
            ->leftJoin('sentiment_analysis as sa', 'fa.response_id', '=', 'sa.response_id')
            ->join('feedback as f', 'fa.response_id', '=', 'f.response_id')
            ->join('forms as frm', 'f.form_id', '=', 'frm.form_id')
            ->leftJoin('department as d', 'frm.department_id', '=', 'd.department_id') // Added join
            ->where('ff.field_label', 'LIKE', '%Service Availed%')
            ->whereNotNull('fa.answer_text')
            ->where('fa.answer_text', '!=', '');

        if ($selectedDepartment !== 'overall') {
            $serviceQuery->where('frm.department_id', $selectedDepartment);
        }

        $servicePerformance = $serviceQuery->select(
                'fa.answer_text as name',
                DB::raw('COALESCE(d.department_name, "General") as department_name'), // Get Department Name
                DB::raw('COUNT(fa.response_id) as total'),
                DB::raw('COALESCE(ROUND(AVG(sa.confidence_score), 0), 0) as score')
            )
            ->groupBy('fa.answer_text', 'd.department_name') // Group by both
            ->orderByDesc('total')
            ->limit(10)
            ->get();

        $providerQuery = DB::table('feedback_answers as fa')
            ->join('form_fields as ff', 'fa.field_id', '=', 'ff.field_id')
            ->leftJoin('sentiment_analysis as sa', 'fa.response_id', '=', 'sa.response_id')
            ->join('feedback as f', 'fa.response_id', '=', 'f.response_id')
            ->join('forms as frm', 'f.form_id', '=', 'frm.form_id')
            ->leftJoin('department as d', 'frm.department_id', '=', 'd.department_id') // Added join
            ->where('ff.field_label', 'LIKE', '%Name of Service Provider%')
            ->whereNotNull('fa.answer_text')
            ->where('fa.answer_text', '!=', '');

        if ($selectedDepartment !== 'overall') {
            $providerQuery->where('frm.department_id', $selectedDepartment);
        }

        $providerPerformance = $providerQuery->select(
                'fa.answer_text as name',
                DB::raw('COALESCE(d.department_name, "General") as department_name'), // Get Department Name
                DB::raw('COUNT(fa.response_id) as total'),
                DB::raw('COALESCE(ROUND(AVG(sa.confidence_score), 0), 0) as score')
            )
            ->groupBy('fa.answer_text', 'd.department_name') // Group by both
            ->orderByDesc('total')
            ->limit(10)
            ->get();
            
        // 5. Assemble Metrics
        $metrics = [
            // SuperAdmins see global stats; Focal Persons see limited general stats
            'total_users'         => $isSuperAdmin ? Account::getTotalCount() : 0,
            'total_departments'   => $isSuperGroup ? $departments->count() : 1,
            'active_forms'        => $isSuperGroup ? Form::getActiveCount() : ($activeForm ? 1 : 0),
            
            // Allow Feedback Committee to populate the filter dropdown
            'departments'         => $isSuperGroup ? $departments : $departments->where('department_id', $departmentId)->values(),

            // Scoped by the forced $selectedDepartment variable
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
            
            // Replaced the mock arrays with the dynamic SQL variable queries
            'service_performance' => $servicePerformance,
            'provider_performance'=> $providerPerformance
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