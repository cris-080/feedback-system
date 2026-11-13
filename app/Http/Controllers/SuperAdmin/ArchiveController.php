<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Form;
use App\Models\Department;
use App\Models\Account; // <-- Added Account model import

class ArchiveController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->query('search');
        $departmentFilter = $request->query('department');
        $activeTab = $request->query('tab', 'forms');

        // 1. Fetch Archived Forms
        $formsQuery = Form::withTrashed()
            ->leftJoin('department', 'forms.department_id', '=', 'department.department_id')
            ->select('forms.*', 'department.department_name')
            ->where(function($query) {
                $query->where('forms.status', 'Archived')
                      ->orWhereNotNull('forms.deleted_at');
            });

        if (!empty($search)) {
            $like = '%' . trim($search) . '%';
            $formsQuery->where(function ($q) use ($like) {
                $q->where('forms.title', 'LIKE', $like)
                  ->orWhere('forms.form_id', 'LIKE', $like)
                  ->orWhere('department.department_name', 'LIKE', $like)
                  // Search Date Archived
                  ->orWhere('forms.deleted_at', 'LIKE', $like)
                  ->orWhereRaw("DATE_FORMAT(forms.deleted_at, '%b %e, %Y') LIKE ?", [$like])
                  ->orWhereRaw("DATE_FORMAT(forms.created_at, '%b %e, %Y') LIKE ?", [$like]);
            });
        }

        if (!empty($departmentFilter)) {
            if (strtolower($departmentFilter) === 'general') {
                $formsQuery->whereNull('forms.department_id');
            } else {
                $formsQuery->where('department.department_name', $departmentFilter);
            }
        }

        // 2. Fetch Archived Departments
        $departmentsQuery = Department::onlyTrashed();

        if (!empty($search)) {
            $like = '%' . trim($search) . '%';
            $departmentsQuery->where(function ($q) use ($like) {
                $q->where('department_name', 'LIKE', $like)
                  ->orWhere('department_id', 'LIKE', $like)
                  ->orWhere('deleted_at', 'LIKE', $like)
                  ->orWhereRaw("DATE_FORMAT(deleted_at, '%b %e, %Y') LIKE ?", [$like]);
            });
        }

        // 3. Fetch Archived Accounts
        $accountsQuery = Account::onlyTrashed();

        if (!empty($search)) {
            $like = '%' . trim($search) . '%';
            $accountsQuery->where(function ($q) use ($like) {
                $q->where('firstname', 'LIKE', $like)
                  ->orWhere('lastname', 'LIKE', $like)
                  ->orWhereRaw("CONCAT(firstname, ' ', lastname) LIKE ?", [$like])
                  ->orWhere('email', 'LIKE', $like)
                  ->orWhere('role', 'LIKE', $like)
                  ->orWhere('deleted_at', 'LIKE', $like)
                  ->orWhereRaw("DATE_FORMAT(deleted_at, '%b %e, %Y') LIKE ?", [$like]);
            });
        }

        // 4. Fetch Archived Reports via JSON metadata flag
        $reportsQuery = \App\Models\Report::with('department')
            ->where('report_data->metadata->is_deleted', true);

        if (!empty($search)) {
            $like = '%' . trim($search) . '%';
            $reportsQuery->where(function ($q) use ($like) {
                $q->where('report_name', 'LIKE', $like)
                  ->orWhere('report_type', 'LIKE', $like)
                  ->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(report_data, '$.metadata.deleted_at')) LIKE ?", [$like])
                  ->orWhereHas('department', function ($dq) use ($like) {
                      $dq->where('department_name', 'LIKE', $like);
                  });
            });
        }

        return inertia('SuperAdmin/Archives', [
            'archivedForms'       => $activeTab === 'forms' ? $formsQuery->orderBy('forms.deleted_at', 'desc')->paginate(10)->withQueryString() : [],
            'archivedDepartments' => $activeTab === 'departments' ? $departmentsQuery->orderBy('deleted_at', 'desc')->paginate(10)->withQueryString() : [],
            'archivedAccounts'    => $activeTab === 'accounts' ? $accountsQuery->orderBy('deleted_at', 'desc')->paginate(10)->withQueryString() : [],
            'archivedReports'     => $activeTab === 'reports' ? $reportsQuery->orderBy('updated_at', 'desc')->paginate(10)->withQueryString() : [],
            'uniqueDepartments'   => Department::withTrashed()->orderBy('department_name', 'asc')->pluck('department_name'),
            'filters'             => $request->only(['search', 'department', 'tab'])
        ]);
    }
}