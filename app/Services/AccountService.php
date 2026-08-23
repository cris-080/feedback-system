<?php

namespace App\Services;

use App\Models\Account;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AccountService
{
    public function createAccount(array $data)
    {
        $this->enforceOneFeedbackCommitteeRule($data['role']);

        return Account::create([
            'firstname'     => trim($data['firstname']),
            'lastname'      => trim($data['lastname']),
            'username'      => trim($data['username']),
            'email'         => trim($data['email']),
            'password_hash' => Hash::make($data['password']),
            'role'          => $data['role'],
            'department_id' => $this->determineDepartmentId($data['role'], $data['department_id'] ?? null),
            'is_active'     => 1,
        ]);
    }

    public function updateAccount(Account $account, array $data)
    {
        $this->enforceOneFeedbackCommitteeRule($data['role'], $account->user_id);

        $updateData = [
            'firstname'     => trim($data['firstname']),
            'lastname'      => trim($data['lastname']),
            'username'      => trim($data['username']),
            'email'         => trim($data['email']),
            'role'          => $data['role'],
            'department_id' => $this->determineDepartmentId($data['role'], $data['department_id'] ?? null),
        ];

        if (!empty($data['password'])) {
            $updateData['password_hash'] = Hash::make($data['password']);
        }

        $account->update($updateData);
        return $account;
    }

    private function enforceOneFeedbackCommitteeRule(string $role, ?int $ignoreUserId = null): void
    {
        if ($role === 'Feedback Committee') {
           $query = Account::query()->where('role', 'Feedback Committee');
            
            if ($ignoreUserId) {
                $query->where('user_id', '!=', $ignoreUserId);
            }

            if ($query->exists()) {
                throw ValidationException::withMessages([
                    'role' => 'A Feedback Committee account already exists. Please remove or suspend it first.'
                ]);
            }
        }
    }

    private function determineDepartmentId(string $role, ?int $departmentId): ?int
    {
        return in_array($role, ['Feedback Committee', 'SuperAdmin']) ? null : $departmentId;
    }
}