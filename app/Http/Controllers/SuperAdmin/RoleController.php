<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RoleController extends Controller
{
    public function index()
    {
        return Inertia::render('SuperAdmin/Roles', [
            'roles' => Role::getAllRolesWithCounts()
        ]);
    }

    public function store(Request $request)
    {
        return back()->with('error', 'Action Denied: System architecture is strictly locked to the 3 core institutional roles.');
    }

    public function update(Request $request, $id)
    {
        $role = Role::findOrFail($id);

        $validated = $request->validate([
            'description' => 'nullable|string|max:255',
        ]);

        $role->updateDescription($validated['description'] ?? null);

        AuditLog::logAction('Updated', 'Roles', "Updated description for system role: {$role->role_name}.");

        return back()->with('success', 'System role description updated safely.');
    }

    public function destroy($id)
    {
        return back()->with('error', 'Action Denied: System core roles cannot be deleted.');
    }
}