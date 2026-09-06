<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Validation\ValidationException;
use App\Models\Account;
use App\Models\Department;
use App\Models\Role;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UserController extends Controller
{
        public function index(Request $request)
        {
            $departments = Department::orderBy('department_name')->get();

            return inertia('SuperAdmin/Users', [
                'accounts'    => Account::getPaginatedManagedUsers($request->all()), 
                'departments' => $departments,
                'roles'       => Role::all(),
                'filters'     => $request->only(['search', 'role', 'department']),
            ]);
        }

     public function store(Request $request)
    {
        $validated = $request->validate([
            'firstname'     => 'required|string|max:50',
            'lastname'      => 'required|string|max:50',
            'username'      => 'required|string|max:50|unique:account,username',
            'email'         => 'required|email|max:100|unique:account,email',
            'password'      => 'required|string|min:8',
            'role'          => 'required|string',
            'role_id'       => 'nullable|integer|exists:roles,role_id',
            'department_id' => 'nullable|integer|exists:department,department_id',
        ]);

        // Enforce Strict Single Feedback Committee Rule
        if ($request->role === 'Feedback Committee') {
            $activeCommitteeExists = Account::where('role', 'Feedback Committee')->exists();

            if ($activeCommitteeExists) {
                return back()->with('error', 'A Feedback Committee account already exists. You must remove or change the role of the existing account first.');
            }
        }
    
        // Delegate to Fat Model (Creation and Auto-Sync handled inside)
        Account::createUser($validated);

        return back()->with('success', 'User account created successfully!');
    }

        public function update(Request $request, $id)
        {
            $account = Account::findOrFail($id);

            $validated = $request->validate([
                'firstname'     => 'required|string|max:50',
                'lastname'      => 'required|string|max:50',
                'username'      => 'required|string|max:50|unique:account,username,' . $id . ',user_id',
                'email'         => 'required|email|max:100|unique:account,email,' . $id . ',user_id',
                'password'      => 'nullable|string|min:8',
                'role'          => 'required|string',
                'role_id'       => 'nullable|integer|exists:roles,role_id',
                'department_id' => 'nullable|integer|exists:department,department_id',
        ]);

        // Enforce Strict Single Feedback Committee Rule (Excludes current $id)
        if ($request->role === 'Feedback Committee') {
            $activeCommitteeExists = Account::where('role', 'Feedback Committee')
                ->where('user_id', '!=', $id) 
                ->exists(); 

            if ($activeCommitteeExists) {
                return back()->with('error', 'A Feedback Committee account already exists. You must remove or change the role of the existing account first.');
            }
        }

        // Delegate to Fat Model (Updating and Auto-Sync handled inside)
        $account->updateUser($validated);

        return back()->with('success', 'User details updated successfully.');
    }

        public function destroy($id)
        {
            $account = Account::findOrFail($id);

            if (!$account->deleteUser()) {
                return back()->with('error', 'Protected root accounts cannot be deleted.');
            }

            return back()->with('success', 'User account removed successfully.');
        }
}