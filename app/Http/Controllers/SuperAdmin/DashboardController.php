<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Account;
use App\Models\Department;
use App\Models\Form;
use App\Models\Feedback;
use Illuminate\Support\Facades\Crypt;
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

        // 4. Assemble Metrics
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
        ];

        // 5. Return View
        return Inertia::render('SuperAdmin/Dashboard', [
            'metrics'        => $metrics,
            'recentAccounts' => $isSuperAdmin ? Account::getRecentAccounts(5) : [],
            'recentForms'    => $isSuperAdmin ? Form::getRecentFormsWithDepartment(5) : [],
            'isSuperAdmin'   => $isSuperAdmin,
            'deploymentData' => $deploymentData
        ]);
    }
}