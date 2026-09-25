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
        // Capture incoming filters
        $search = $request->query('search');
        $departmentFilter = $request->query('department');

        // 1. Fetch forms that are soft-deleted OR have the 'Archived' status
        $formsQuery = Form::withTrashed()
            ->leftJoin('department', 'forms.department_id', '=', 'department.department_id')
            ->select('forms.*', 'department.department_name')
            ->where(function($query) {
                $query->where('forms.status', 'Archived')
                      ->orWhereNotNull('forms.deleted_at');
            });

        // Apply Search Filter for Forms
        if (!empty($search)) {
            $formsQuery->where(function ($q) use ($search) {
                $q->where('forms.title', 'LIKE', '%' . $search . '%')
                  ->orWhere('forms.form_id', 'LIKE', '%' . $search . '%');
            });
        }

        // Apply Department Filter for Forms
        if (!empty($departmentFilter)) {
            if (strtolower($departmentFilter) === 'general') {
                $formsQuery->whereNull('forms.department_id');
            } else {
                $formsQuery->where('department.department_name', $departmentFilter);
            }
        }

        $archivedForms = $formsQuery
            ->orderBy('forms.deleted_at', 'desc')
            ->orderBy('forms.updated_at', 'desc')
            ->paginate(10)
            ->withQueryString(); // Ensures pagination links keep the search parameters

        // 2. Fetch soft-deleted departments
        $departmentsQuery = Department::onlyTrashed();

        // Apply Search Filter for Departments
        if (!empty($search)) {
            $departmentsQuery->where('department_name', 'LIKE', '%' . $search . '%');
        }

        $archivedDepartments = $departmentsQuery
            ->orderBy('deleted_at', 'desc')
            ->paginate(10)
            ->withQueryString();

       // 3. Fetch soft-deleted accounts
        $accountsQuery = Account::onlyTrashed();

        if (!empty($search)) {
            $accountsQuery->where(function ($q) use ($search) {
                $q->where('firstname', 'LIKE', '%' . $search . '%')
                  ->orWhere('lastname', 'LIKE', '%' . $search . '%')
                  ->orWhere('email', 'LIKE', '%' . $search . '%');
            });
        }

        $archivedAccounts = $accountsQuery->orderBy('deleted_at', 'desc')->paginate(10)->withQueryString();

        // 4. Get all department names (including deleted ones) for the dropdown
        $uniqueDepartments = Department::withTrashed()
            ->orderBy('department_name', 'asc')
            ->pluck('department_name');

            

        return inertia('SuperAdmin/Archives', [
            'archivedForms'       => $archivedForms,
            'archivedDepartments' => $archivedDepartments,
            'archivedAccounts'    => $archivedAccounts, // <-- Added archived accounts variable
            'uniqueDepartments'   => $uniqueDepartments, // Populates the dropdown menu
            'filters'             => $request->only(['search', 'department', 'tab'])
        ]);
    }
}