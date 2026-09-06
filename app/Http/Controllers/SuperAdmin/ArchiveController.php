<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Form;
use App\Models\Department;

class ArchiveController extends Controller
{
    public function index(Request $request)
    {
        // 1. Fetch forms that are soft-deleted OR have the 'Archived' status
        $archivedForms = Form::withTrashed()
            ->leftJoin('department', 'forms.department_id', '=', 'department.department_id')
            ->select('forms.*', 'department.department_name')
            ->where(function($query) {
                $query->where('forms.status', 'Archived')
                      ->orWhereNotNull('forms.deleted_at');
            })
            ->orderBy('forms.deleted_at', 'desc')
            ->orderBy('forms.updated_at', 'desc')
            ->paginate(10);

        // 2. Fetch soft-deleted departments
        $archivedDepartments = Department::onlyTrashed()
            ->orderBy('deleted_at', 'desc')
            ->paginate(10);

        return inertia('SuperAdmin/Archives', [
            'archivedForms' => $archivedForms,
            'archivedDepartments' => $archivedDepartments,
            'filters' => $request->only(['search', 'department'])
        ]);
    }
}