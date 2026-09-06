<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\DepartmentService;
use App\Http\Requests\StoreDepartmentRequest;
use App\Http\Requests\UpdateDepartmentRequest;
use App\Http\Resources\DepartmentResource;
use App\Models\ServiceProvider;
use Illuminate\Http\Request;
use App\Models\DepartmentPosition;
use App\Mail\FormLinkMail;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Crypt;
use App\Models\Account;
use App\Models\Form;
use Inertia\Inertia;

class DepartmentController extends Controller


    {    public function index(Request $request)
        {
            $query = Department::query();

            // Check your existing search filter logic
            if ($request->filled('search')) {
                $search = $request->input('search');
                $query->where('department_name', 'like', "%{$search}%");
            }

            

            return inertia('SuperAdmin/Departments', [
                'departments' => Department::getPaginatedWithRelations($request->input('search')),
                'filters'     => $request->only(['search']),
            ]);
        }
        public function store(StoreDepartmentRequest $request)
        {
            $payload = [
                'department_name' => trim($request->validated('name')),
                'description'     => trim($request->validated('description') ?? ''),
            ];

            // Delegate to Fat Model
            Department::createDepartment($payload);

            return back()->with('success', 'Department successfully provisioned. You can now assign a Focal Person from the Users tab.');
        }

    

        public function update(UpdateDepartmentRequest $request, $id)
        {
            $department = Department::findOrFail($id);
            
            $payload = [
                'department_name' => trim($request->validated('name')),
                'description'     => trim($request->validated('description') ?? ''),
            ];

            // Delegate to Fat Model
            $department->updateDepartment($payload);

            return back()->with('success', 'Department successfully updated.');
        }

        /**
         * Soft Delete (Archive) the department.
         */
        public function destroy($id)
        {
            $department = Department::findOrFail($id);

            // Soft delete the department without nullifying forms/accounts.
            // This preserves historical data relationships.
            $department->delete();

            return back()->with('success', 'Department successfully archived.');
        }

        /**
         * Restore an archived department.
         */
        public function restore($id)
        {
            $department = Department::onlyTrashed()->findOrFail($id);
            $department->restore();

            return back()->with('success', 'Department restored successfully.');
        }

        /**
         * Permanently delete a department from the database.
         */
        public function forceDelete($id)
        {
            $department = Department::onlyTrashed()->findOrFail($id);

            // Perform strict cleanup only when permanently destroying data
            DepartmentService::where('department_id', $id)->delete();
            Account::where('department_id', $id)->update(['department_id' => null]);
            Form::where('department_id', $id)->update(['department_id' => null]);

            $department->forceDelete();

            return back()->with('success', 'Department permanently deleted.');
        }

        public function addService(Request $request, $departmentId)
        {
        $request->validate(['service_name' => 'required|string|max:255']);
            
            $department = Department::findOrFail($departmentId);

            $department->services()->create([
                'service_name' => trim($request->service_name)
            ]);

            return back()->with('success', 'Service added to department.');
        }

        public function removeService($id) 
        {
            $service = DepartmentService::findOrFail($id);
            $service->delete();

            return back()->with('success', 'Service successfully removed.');
        }

        // Store a new position under a department
        public function storePosition(Request $request, $departmentId)
        {
            $validated = $request->validate([
                'position_name' => 'required|string|max:255',
            ]);

            DepartmentPosition::create([
                'department_id' => $departmentId,
                'position_name' => trim($validated['position_name']),
            ]);

            return back()->with('success', 'Position added successfully.');
        }

        // Delete a position
        public function destroyPosition($positionId)
        {
            $position = DepartmentPosition::findOrFail($positionId);
            $position->delete();

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

            // 3. Return Response
            return back()->with('success', 'Position successfully bulk-added to selected departments.');
        }

            public function storeProvider(Request $request, $departmentId)
        {
            $validated = $request->validate([
                'name'     => 'required|string|max:255',
                'position' => 'nullable|string|max:255',
            ]);

            ServiceProvider::create([
                'department_id' => $departmentId,
                'name'          => trim($validated['name']),
                'position'      => trim($validated['position'] ?? ''),
            ]);

            return back()->with('success', 'Service provider added successfully.');
        }

        public function destroyProvider($providerId)
        {
            $provider = ServiceProvider::findOrFail($providerId);
            $provider->delete();

            return back()->with('success', 'Service provider removed successfully.');
        }
    
}