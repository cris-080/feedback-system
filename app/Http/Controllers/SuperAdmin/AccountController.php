<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Validation\ValidationException;
use App\Models\Account;
use  \App\Models\AuditLog;
use App\Models\Department;
use App\Models\Role;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Mail;

class AccountController extends Controller
{
        public function index(Request $request)
    {
        $departments = Department::orderBy('department_name')->get();
        
        $filters = [
            'search' => $request->query('search', ''),
            'role' => $request->query('role', ''),
            'department' => $request->query('department', '')
        ];

       return inertia('SuperAdmin/Accounts', [
            'accounts'    => Account::getPaginatedManagedUsers($filters), 
            'departments' => $departments,
            'roles'       => Role::all(),
            'filters'     => $filters,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'firstname'     => 'required|string|max:50',
            'lastname'      => 'required|string|max:50',
            'username'      => 'required|string|max:50|unique:account,username',
            'email'         => 'required|email|max:100|unique:account,email',
            'role'          => 'required|string|in:SuperAdmin,Feedback Committee,Focal Person',
            'role_id'       => 'nullable|integer|exists:roles,role_id',
            'department_id' => 'required_if:role,Focal Person|nullable|integer|exists:department,department_id',
        ]);

        if ($request->role === 'Feedback Committee') {
            if (Account::where('role', 'Feedback Committee')->exists()) {
                throw ValidationException::withMessages([
                    'role' => 'A Feedback Committee account already exists.',
                ]);
            }
        }

        if ($validated['role'] === 'Focal Person' && !empty($validated['department_id'])) {
            $existingFocal = Account::where('role', 'Focal Person')
                ->where('department_id', $validated['department_id'])
                ->first();

            if ($existingFocal) {
                throw ValidationException::withMessages([
                    'department_id' => "Only one Focal Person can be assigned per department. {$existingFocal->firstname} {$existingFocal->lastname} ({$existingFocal->email}) is already assigned to this department.",
                ]);
            }
        }
    
     // Generate a secure, random 10-character temporary password
        $temporaryPassword =  Str::random(10);
        $validated['password'] = $temporaryPassword;
        
        $user = Account::createUser($validated);
        
        // --- AUDIT TRAIL ---
         AuditLog::logAction('Created', 'Accounts', "Created new {$user->role} account for {$user->firstname} {$user->lastname} ({$user->email}).");

        $loginUrl = route('login');

       try {
             Mail::send(
                'emails.new_account',
                [
                    'user' => $user,
                    'temporaryPassword' => $temporaryPassword,
                    'loginUrl' => $loginUrl
                ],
                function ($message) use ($user) {
                    $message->to($user->email)->subject('Your CLSU FMS Account Credentials');
                }
            );
        } catch (\Exception $e) {
           
            return back()->with('success', "User created! (Email failed. Temp Password: {$temporaryPassword})");
        }

      return back()->with('success', 'User account created and credentials emailed!');
    }

    /**
     * UPDATE EXISTING ACCOUNT
     */
    public function update(Request $request, $id)
    {
        $user = Account::findOrFail($id);

       $validated = $request->validate([
            'firstname'     => 'required|string|max:50',
            'lastname'      => 'required|string|max:50',
            'username'      => 'required|string|max:50|unique:account,username,' . $user->user_id . ',user_id',
            'email'         => 'required|email|max:100|unique:account,email,' . $user->user_id . ',user_id',
            'role'          => 'required|string|in:SuperAdmin,Feedback Committee,Focal Person',
            'role_id'       => 'nullable|integer|exists:roles,role_id',
            'department_id' => 'required_if:role,Focal Person|nullable|integer|exists:department,department_id',
            'password'      => 'nullable|string|min:8',
        ]);

        if ($request->role === 'Feedback Committee') {
            $existingCommittee = Account::where('role', 'Feedback Committee')
                ->where('user_id', '!=', $user->user_id)
                ->exists();

            if ($existingCommittee) {
                throw ValidationException::withMessages([
                    'role' => 'A Feedback Committee account already exists.',
                ]);
            }
        }

        if ($validated['role'] === 'Focal Person' && !empty($validated['department_id'])) {
            $existingFocal = Account::where('role', 'Focal Person')
                ->where('department_id', $validated['department_id'])
                ->where('user_id', '!=', $user->user_id)
                ->first();

            if ($existingFocal) {
                throw ValidationException::withMessages([
                    'department_id' => "Only one Focal Person can be assigned per department. {$existingFocal->firstname} {$existingFocal->lastname} ({$existingFocal->email}) is already assigned to this department.",
                ]);
            }
        }

        $user->updateUser($validated);

        // --- AUDIT TRAIL ---
        AuditLog::logAction('Updated', 'Accounts', "Updated {$user->role} account for {$user->firstname} {$user->lastname} ({$user->email}).");

        return back()->with('success', 'Account details successfully updated.');
    }


        /**
         * ARCHIVE ACCOUNT (Soft Delete)
         */
        public function destroy($id)
     {
        $user = Account::findOrFail($id);
        
        if (!$user->deleteUser()) {
            return back()->with('error', 'Action Denied: You cannot archive a SuperAdmin or Root account.');
        }
        
        // --- AUDIT TRAIL ---
         AuditLog::logAction('Archived', 'Accounts', "Archived {$user->role} account: {$user->email}.");
        
        return back()->with('success', 'Account successfully archived.');
    }
   /**
     * SUSPEND / RESTORE ACCESS
     */
   public function suspend(Request $request, $id)
    {
        $user = Account::findOrFail($id);
        
        $action = $user->toggleSuspension($request->input('reason'));

        $reasonLog = $action === 'Suspended' ? " Reason: {$user->suspension_reason}" : "";
        AuditLog::logAction($action, 'Accounts', "{$action} account access for {$user->email}.{$reasonLog}");

        return redirect()->back()->with('success', "User access has been " . strtolower($action) . ".");
    }

    /**
     * RESET PASSWORD TO DEFAULT
     */
    public function resetPassword($id)
    {
        $user = Account::findOrFail($id);
        
        $user->resetToDefaultPassword();

        AuditLog::logAction('Updated', 'Accounts', "Force-reset password to default for {$user->email}.");

        return redirect()->back()->with('success', "Password successfully reset to the default system password.");
    }

   /**
     * RESTORE ARCHIVED ACCOUNT
     */
    public function restore($id)
    {
        $user = Account::withTrashed()->findOrFail($id);

        if ($user->role === 'Focal Person' && !empty($user->department_id)) {
            $existingFocal = Account::where('role', 'Focal Person')
                ->where('department_id', $user->department_id)
                ->where('user_id', '!=', $user->user_id)
                ->first();

            if ($existingFocal) {
                return back()->with('error', "Cannot restore Focal Person: {$existingFocal->firstname} {$existingFocal->lastname} is already assigned to this department.");
            }
        }

        $user->restore();

        if ($user->role === 'Focal Person' && !empty($user->department_id)) {
            Department::where('department_id', $user->department_id)
                ->update(['focal_person_id' => $user->user_id]);
        }

        // --- AUDIT TRAIL ---
        AuditLog::logAction('Restored', 'Accounts', "Restored archived account: {$user->email}.");

        return back()->with('success', 'Account successfully restored and is now active.');
    }

    /**
     * PERMANENTLY DELETE ACCOUNT
     */
    public function forceDelete($id)
    {
        $user = Account::withTrashed()->findOrFail($id);
        
        // Store email before force deleting so we can log it
        $deletedEmail = $user->email;
        $user->forceDelete(); 

        // --- AUDIT TRAIL ---
        AuditLog::logAction('Deleted', 'Accounts', "Permanently deleted account: {$deletedEmail}.");

        return back()->with('success', 'Account permanently deleted from the system.');
    }
    /**
     * SHOW SETUP PASSWORD PAGE (Via Email Link)
     */
    public function setupPassword(Request $request, $id)
    {
        if (! $request->hasValidSignature()) {
            abort(401, 'This setup link is invalid or has expired.');
        }
        
        $user = Account::findOrFail($id);
        
        return Inertia::render('Auth/SetupPassword', [
            'email' => $user->email,
            'postUrl' => route('account.setup.save', ['id' => $id, 'signature' => $request->query('signature')])
        ]);
    }

    /**
     * SAVE NEW PASSWORD
     */
    public function savePassword(Request $request, $id)
    {
        if (! $request->hasValidSignature()) {
            abort(401, 'This setup link is invalid or has expired.');
        }

        $request->validate(['password' => 'required|string|min:8|confirmed']);

        $user = Account::findOrFail($id);
        $user->password_hash = Hash::make($request->password);
        $user->save();

        return redirect()->route('login')->with('status', 'Password set successfully! You may now log in.');
    }
}