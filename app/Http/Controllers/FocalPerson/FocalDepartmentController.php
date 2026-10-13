<?php

namespace App\Http\Controllers\FocalPerson;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Department;
use App\Models\DepartmentService;
use App\Models\DepartmentPosition;
use App\Models\ServiceProvider;
use App\Models\AuditLog;
use Inertia\Inertia;

class FocalDepartmentController extends Controller
{
    /**
     * Display the focal person's department configuration.
     */
    public function index()
    {
        $user = auth()->user();
        
        $department = Department::with(['services', 'positions', 'serviceProviders'])
            ->where('department_id', $user->department_id)
            ->firstOrFail();

        return Inertia::render('FocalPerson/DepartmentConfig', [
            'department' => $department
        ]);
    }

    // --- SERVICES ---
    public function storeService(Request $request)
    {
        $request->validate(['service_name' => 'required|string|max:255']);
        
        DepartmentService::create([
            'department_id' => auth()->user()->department_id,
            'service_name'  => trim($request->service_name)
        ]);

        // --- AUDIT TRAIL ---
        AuditLog::logAction('Updated', 'Departments', "Added service '{$request->service_name}' to department configuration.");

        return back()->with('success', 'Service added successfully.');
    }

    public function destroyService($id)
    {
        // The where() clause ensures they can only delete their own department's services
        $service = DepartmentService::where('department_id', auth()->user()->department_id)->findOrFail($id);
        $serviceName = $service->service_name;
        $service->delete();

        // --- AUDIT TRAIL ---
        AuditLog::logAction('Updated', 'Departments', "Removed service '{$serviceName}' from department configuration.");

        return back()->with('success', 'Service removed.');
    }
   // --- POSITIONS ---
    public function storePosition(Request $request)
    {
        $validated = $request->validate(['position_name' => 'required|string|max:255']);

        DepartmentPosition::create([
            'department_id' => auth()->user()->department_id,
            'position_name' => trim($validated['position_name'])
        ]);

        // --- AUDIT TRAIL ---
        AuditLog::logAction('Updated', 'Departments', "Added position '{$validated['position_name']}' to department configuration.");

        return back()->with('success', 'Position added successfully.');
    }

    public function destroyPosition($id)
    {
        $position = DepartmentPosition::where('department_id', auth()->user()->department_id)->findOrFail($id);
        $positionName = $position->position_name;
        $position->delete();

        // --- AUDIT TRAIL ---
        AuditLog::logAction('Updated', 'Departments', "Removed position '{$positionName}' from department configuration.");

        return back()->with('success', 'Position removed.');
    }

   // --- SERVICE PROVIDERS ---
    public function storeProvider(Request $request)
    {
        $validated = $request->validate([
            'name'     => 'required|string|max:255',
            'position' => 'nullable|string|max:255',
        ]);

        ServiceProvider::create([
            'department_id' => auth()->user()->department_id,
            'name'          => trim($validated['name']),
            'position'      => trim($validated['position'] ?? '')
        ]);

        // --- AUDIT TRAIL ---
        AuditLog::logAction('Updated', 'Departments', "Added service provider '{$validated['name']}' to department configuration.");

        return back()->with('success', 'Service Provider added successfully.');
    }

    public function destroyProvider($id)
    {
        $provider = ServiceProvider::where('department_id', auth()->user()->department_id)->findOrFail($id);
        $providerName = $provider->name;
        $provider->delete();

        // --- AUDIT TRAIL ---
        AuditLog::logAction('Updated', 'Departments', "Removed service provider '{$providerName}' from department configuration.");

        return back()->with('success', 'Service Provider removed.');
    }
}