<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\DepartmentService;
use App\Http\Requests\UpdateDepartmentRequest;
use App\Models\ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Models\DepartmentPosition;
use App\Models\Account;
use App\Models\Form;
use App\Models\AuditLog;
use Illuminate\Support\Facades\DB; 
use Inertia\Inertia;;

class DepartmentController extends Controller
{    
   public function index(Request $request)
    {
        $userRole = strtolower(trim(auth()->user()->role ?? ''));
        $isSuperAdmin = $userRole === 'superadmin';
        // Allow Feedback Committee to safely render this page
        $isFeedbackCommittee = $userRole === 'feedback committee' || $userRole === 'feedbackcommittee';

        // Fail-safe block to ensure Focal Persons can never access this route
        if (!$isSuperAdmin && !$isFeedbackCommittee) {
            abort(403, 'Unauthorized access.');
        }

        return inertia('SuperAdmin/Departments', [
            'departments'  => Department::getPaginatedWithRelations($request->input('search'),$request->input('status', 'all')),
            'filters'      => $request->only(['search','status']),
            'isSuperAdmin' => $isSuperAdmin || $isFeedbackCommittee,
        ]);
    }

    /**
     * Store a newly created department.
     * THIN CONTROLLER: Validates the request, delegates to the Model.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'                         => 'required|string|max:255|unique:department,department_name',
            'description'                  => 'nullable|string',
            'classification'               => 'required|in:CC,Non-CC',
            'initial_services'             => 'nullable|array',
            'initial_services.*.name'      => 'nullable|string|max:255',
            'initial_positions'            => 'nullable|array',
            'initial_positions.*.name'     => 'nullable|string|max:255',
            'initial_providers'            => 'nullable|array',
            'initial_providers.*.name'     => 'nullable|string|max:255',
            'initial_providers.*.position' => 'nullable|string|max:255',
        ]);;

        // Delegate entirely to the Fat Model
        Department::createDepartment($validated);
        
        // --- AUDIT TRAIL ---
        AuditLog::logAction('Created', 'Departments', "Created new department: {$validated['name']}.");

        return back()->with('success', 'Department successfully created.');
    }

    public function update(UpdateDepartmentRequest $request, $id)
    {
        // Add extra validation here in case it's not in your UpdateDepartmentRequest yet
        $extraValidated = $request->validate([
            'classification' => 'required|in:CC,Non-CC'
        ]);

        $department = Department::findOrFail($id);
        
        $payload = [
            'department_name' => trim($request->validated('name')),
            'description'     => trim($request->validated('description') ?? ''),
            'classification'  => $extraValidated['classification'],
        ];

        // Delegate to Fat Model
        $department->updateDepartment($payload);
        
        // --- AUDIT TRAIL ---
        AuditLog::logAction('Updated', 'Departments', "Updated department: {$payload['department_name']}.");

        return back()->with('success', 'Department successfully updated.');
    }

    /**
     * Soft Delete (Archive) the department.
     */
    public function destroy($id)
    {
        $department = Department::findOrFail($id);
        $departmentName = $department->department_name;

        // Soft delete the department without nullifying forms/accounts.
        // This preserves historical data relationships.
        $department->delete();
        
        // --- AUDIT TRAIL ---
        AuditLog::logAction('Archived', 'Departments', "Archived department: {$departmentName}.");

        return back()->with('success', 'Department successfully archived.');
    }

    /**
     * Restore an archived department.
     */
    public function restore($id)
    {
        $department = Department::onlyTrashed()->findOrFail($id);
        $department->restore();
        
        // --- AUDIT TRAIL ---
        AuditLog::logAction('Restored', 'Departments', "Restored archived department: {$department->department_name}.");

        return back()->with('success', 'Department restored successfully.');
    }

    /**
     * Permanently delete a department from the database.
     */
    public function forceDelete($id)
    {
        $department = Department::onlyTrashed()->findOrFail($id);
        $departmentName = $department->department_name;

        // Perform strict cleanup only when permanently destroying data
        DepartmentService::where('department_id', $id)->delete();
        Account::where('department_id', $id)->update(['department_id' => null]);
        Form::where('department_id', $id)->update(['department_id' => null]);

        $department->forceDelete();
        
        // --- AUDIT TRAIL ---
        AuditLog::logAction('Deleted', 'Departments', "Permanently deleted department: {$departmentName} and nullified related accounts/forms.");

        return back()->with('success', 'Department permanently deleted.');
    }

   public function addService(Request $request, $departmentId)
    {
        $request->validate([
            'service_name' => [
                'required', 'string', 'max:255',
                Rule::unique('department_services', 'service_name')->where('department_id', $departmentId)
            ]
        ]);
        
        $department = Department::findOrFail($departmentId);

        $department->services()->create([
            'service_name' => trim($request->service_name)
        ]);
        
        // --- AUDIT TRAIL ---
        AuditLog::logAction('Updated', 'Departments', "Added service '{$request->service_name}' to department: {$department->department_name}.");

        return back()->with('success', 'Service added to department.');
    }

    public function removeService($id) 
    {
        $service = DepartmentService::findOrFail($id);
        $serviceName = $service->service_name;
        $departmentName = Department::find($service->department_id)->department_name ?? 'Unknown';
        
        $service->delete();
        
        // --- AUDIT TRAIL ---
        AuditLog::logAction('Updated', 'Departments', "Removed service '{$serviceName}' from department: {$departmentName}.");

        return back()->with('success', 'Service successfully removed.');
    }

    // Store a new position under a department
    public function storePosition(Request $request, $departmentId)
    {
        $validated = $request->validate([
            'position_name' => [
                'required', 'string', 'max:255',
                Rule::unique('department_positions', 'position_name')->where('department_id', $departmentId)
            ]
        ]);

        DepartmentPosition::create([
            'department_id' => $departmentId,
            'position_name' => trim($validated['position_name']),
        ]);
        
        $departmentName = Department::find($departmentId)->department_name ?? 'Unknown';
        
        // --- AUDIT TRAIL ---
        AuditLog::logAction('Updated', 'Departments', "Added position '{$validated['position_name']}' to department: {$departmentName}.");

        return back()->with('success', 'Position added successfully.');
    }

    // Delete a position
    public function destroyPosition($positionId)
    {
        $position = DepartmentPosition::findOrFail($positionId);
        $positionName = $position->position_name;
        $departmentName = Department::find($position->department_id)->department_name ?? 'Unknown';
        
        $position->delete();
        
        // --- AUDIT TRAIL ---
        AuditLog::logAction('Updated', 'Departments', "Removed position '{$positionName}' from department: {$departmentName}.");

        return back()->with('success', 'Position removed successfully.');
    }

    public function getPositionsByDepartment($departmentId)
    {
        return response()->json(DepartmentPosition::getByDepartment($departmentId));
    }
    
    // Bulk assign a position to multiple/all departments
    public function bulkStorePosition(Request $request)
    {
        // 1. Handle HTTP Request & Validation
        $validated = $request->validate([
            'position_name' => 'required|string|max:255',
            'department_ids' => 'required|array',
            'department_ids.*' => 'exists:department,department_id'
        ]);

        // 2. Delegate Business Logic to the Model
        DepartmentPosition::bulkAssignPositions(
            $validated['department_ids'], 
            $validated['position_name']
        );
        
        // --- AUDIT TRAIL ---
        $deptCount = count($validated['department_ids']);
        AuditLog::logAction('Updated', 'Departments', "Bulk assigned position '{$validated['position_name']}' to {$deptCount} departments.");

        // 3. Return Response
        return back()->with('success', 'Position successfully bulk-added to selected departments.');
    }

    public function storeProvider(Request $request, $departmentId)
    {
        $validated = $request->validate([
            'name' => [
                'required', 'string', 'max:255',
                Rule::unique('service_providers', 'name')->where('department_id', $departmentId)
            ],
            'position' => 'nullable|string|max:255',
        ]);

        ServiceProvider::create([
            'department_id' => $departmentId,
            'name'          => trim($validated['name']),
            'position'      => trim($validated['position'] ?? ''),
        ]);
        
        $departmentName = Department::find($departmentId)->department_name ?? 'Unknown';
        
        // --- AUDIT TRAIL ---
        AuditLog::logAction('Updated', 'Departments', "Added service provider '{$validated['name']}' to department: {$departmentName}.");

        return back()->with('success', 'Service provider added successfully.');
    }

    public function destroyProvider($providerId)
    {
        $provider = ServiceProvider::findOrFail($providerId);
        $providerName = $provider->name;
        $departmentName = Department::find($provider->department_id)->department_name ?? 'Unknown';
        
        $provider->delete();
        
        // --- AUDIT TRAIL ---
        AuditLog::logAction('Updated', 'Departments', "Removed service provider '{$providerName}' from department: {$departmentName}.");

        return back()->with('success', 'Service provider removed successfully.');
    }
}