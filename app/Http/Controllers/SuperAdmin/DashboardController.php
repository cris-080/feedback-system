<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Account;
use App\Models\Department;
use App\Models\Form;
use App\Models\Feedback;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        // 1. Capture Request Parameters
        $range = $request->query('range', 'month');
        $selectedDepartment = $request->query('department', 'overall');

        // 2. Fetch necessary base data
        $departments = Department::select('department_id', 'department_name')->get();

            $metrics = [
                    'total_users'        => Account::getTotalCount(),
                    'total_departments'  => $departments->count(),
                    'active_forms'       => Form::getActiveCount(),
                    'departments'        => $departments,

                    // Pass $selectedDepartment to scope to the selected department
                    'total_feedback'     => Feedback::getFilteredCount($range, $selectedDepartment),
                    'harassment_reports' => Feedback::getHarassmentAlerts($range, $selectedDepartment),
                    'trends'             => Feedback::getTrends($range, $selectedDepartment),

                    'current_range'      => $range,
                    'current_department' => $selectedDepartment,
                    'specific_date'      => $request->get('specific_date'),
                    'specific_month'     => $request->get('specific_month'),

                    'trendData'          => Feedback::getTrendData($range, $selectedDepartment),
                    'department_scores'  => Feedback::getDepartmentScores($range),
                    'sqd_data'           => Feedback::getSqdData($range, $selectedDepartment),
                    'client_types'       => Feedback::getDemographics($range, $selectedDepartment, 'Client'),
                    'sex_demographics'   => Feedback::getDemographics($range, $selectedDepartment, 'Sex'),
                    'transaction_types'  => Feedback::getDemographics($range, $selectedDepartment, 'Transaction'),
                    'cc_metrics'         => Feedback::getCcMetrics($range, $selectedDepartment),
                    'top_words'          => Feedback::getTopRecurringWords($range, $selectedDepartment),
        ];

        // 4. Return View
        return Inertia::render('SuperAdmin/Dashboard', [
            'metrics'        => $metrics,
            'recentAccounts' => Account::getRecentAccounts(5),
            'recentForms'    => Form::getRecentFormsWithDepartment(5)
        ]);
    }
}