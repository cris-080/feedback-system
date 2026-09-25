<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
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
        $validated = $request->validate([
            'role_name'   => 'required|string|max:50|unique:roles,role_name',
            'description' => 'nullable|string|max:255',
        ]);

        $validated['role_key'] = Str::slug($validated['role_name'], '_');

        Role::create($validated);

        return back()->with('success', 'New role created successfully!');
    }

    public function update(Request $request, $id)
    {
        $role = Role::findOrFail($id);

        // If it's a core system role, only allow description and display name updates
        if ($role->is_system) {
            $validated = $request->validate([
                'role_name'   => 'required|string|max:50|unique:roles,role_name,' . $id . ',role_id',
                'description' => 'nullable|string|max:255',
            ]);

            // Expressly DO NOT update role_key
            $role->update([
                'role_name'   => $validated['role_name'],
                'description' => $validated['description'],
            ]);

            return back()->with('success', 'System role details updated safely.');
        }

        // Full update logic for custom roles
        $validated = $request->validate([
            'role_name'   => 'required|string|max:50|unique:roles,role_name,' . $id . ',role_id',
            'description' => 'nullable|string|max:255',
        ]);

        $validated['role_key'] = Str::slug($validated['role_name'], '_');

        $role->update($validated);

        return back()->with('success', 'Custom role updated successfully.');
    }

    public function destroy($id)
    {
        $role = Role::findOrFail($id);

        if ($role->is_system) {
            return back()->with('error', 'System core roles cannot be deleted.');
        }

        if ($role->accounts()->count() > 0) {
            return back()->with('error', 'Cannot delete role: Users are currently assigned to it. Reassign them first.');
        }

        $role->delete();

        return back()->with('success', 'Role deleted successfully.');
    }
}