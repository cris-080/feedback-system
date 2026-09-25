<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Notifications\Notifiable;
use App\Models\Department;
use Illuminate\Database\Eloquent\SoftDeletes;

class Account extends Authenticatable
{

    use SoftDeletes;

    use HasFactory, Notifiable;
    protected $table = 'account';
    protected $primaryKey = 'user_id';
    
    public $timestamps = false;
    protected $fillable = [
        'firstname',
        'lastname',
        'username',
        'email',
        'password_hash',
        'role',
        'role_id',
        'department_id',
        'is_root',
        'is_active'
    ];

    // --- RELATIONSHIPS ---

    public function department()
    {
        return $this->belongsTo(Department::class, 'department_id', 'department_id');
    }

    public function roleModel()
    {
        return $this->belongsTo(Role::class, 'role_id', 'role_id');
    }

    // --- FAT MODEL SCOPES ---

    public function scopeExcludeSuperAdmins(Builder $query): Builder
    {
        return $query->where('account.role', '!=', 'SuperAdmin')
                     ->where('account.is_root', 0);
    }

    public function scopeFilterUserManagement(Builder $query, array $filters): Builder
    {
        return $query
            ->select('account.*', 'department.department_name')
            ->leftJoin('department', 'account.department_id', '=', 'department.department_id')
            ->excludeSuperAdmins()
            ->when($filters['search'] ?? null, function ($q, $search) {
                $q->where(function ($sub) use ($search) {
                    $sub->where('account.firstname', 'like', "%{$search}%")
                        ->orWhere('account.lastname', 'like', "%{$search}%")
                        ->orWhere('account.email', 'like', "%{$search}%")
                        ->orWhere('account.username', 'like', "%{$search}%");
                });
            })
            ->when($filters['role'] ?? null, function ($q, $role) {
                $q->where('account.role', $role);
            })
            ->when($filters['department'] ?? null, function ($q, $department) {
                if ($department === 'unassigned') {
                    $q->whereNull('account.department_id');
                } else {
                    $q->where('department.department_name', $department);
                }
            });
    }

    // --- FAT MODEL METHODS ---

    public static function getPaginatedManagedUsers(array $filters, int $perPage = 10)
    {
        return static::filterUserManagement($filters)
            ->orderBy('account.lastname', 'asc')
            ->paginate($perPage)
            ->withQueryString();
    }

    public static function createUser(array $data): self
    {
        if (empty($data['role_id']) && !empty($data['role'])) {
            $role = Role::where('role_name', $data['role'])->first();
            $data['role_id'] = $role ? $role->role_id : null;
        }

        $account = static::create([
            'firstname'     => $data['firstname'],
            'lastname'      => $data['lastname'],
            'username'      => $data['username'],
            'email'         => $data['email'],
            'password_hash' => Hash::make($data['password']),
            'role'          => $data['role'],
            'role_id'       => $data['role_id'],
            'department_id' => $data['department_id'] ?? null,
            'is_root'       => 0,
            'is_active'     => 1,
        ]);

        // --- BULLETPROOF AUTO-SYNC ---
        if (strtolower($data['role']) === 'focal person' && !empty($data['department_id'])) {
            Department::where('department_id', $data['department_id'])
                      ->update(['focal_person_id' => $account->user_id]);
        }

        return $account;
    }

    public function updateUser(array $data): bool
    {
        if (empty($data['role_id']) && !empty($data['role'])) {
            $role = Role::where('role_name', $data['role'])->first();
            $data['role_id'] = $role ? $role->role_id : null;
        }

        $payload = [
            'firstname'     => $data['firstname'],
            'lastname'      => $data['lastname'],
            'username'      => $data['username'],
            'email'         => $data['email'],
            'role'          => $data['role'],
            'role_id'       => $data['role_id'],
            'department_id' => $data['department_id'] ?? null,
        ];

        if (!empty($data['password'])) {
            $payload['password_hash'] = Hash::make($data['password']);
        }

        $updated = $this->update($payload);

        // --- BULLETPROOF AUTO-SYNC ---
        Department::where('focal_person_id', $this->user_id)
                  ->update(['focal_person_id' => null]);

        if (strtolower($data['role']) === 'focal person' && !empty($data['department_id'])) {
            Department::where('department_id', $data['department_id'])
                      ->update(['focal_person_id' => $this->user_id]);
        }

        return $updated;
    }

    public function deleteUser(): ?bool
    {
        if ($this->role === 'SuperAdmin' || $this->is_root) {
            return false; // <-- It blocks the deletion!
        }
        return $this->delete();
    }

    // --- DASHBOARD METRIC & STATS METHODS ---

    public static function getTotalCount(): int
    {
        return static::excludeSuperAdmins()->count();
    }

    public static function getRecentAccounts(int $limit = 5)
    {
        return static::excludeSuperAdmins()
            ->select('account.*', 'department.department_name')
            ->leftJoin('department', 'account.department_id', '=', 'department.department_id')
            ->orderBy('account.user_id', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Retrieve the focal person assigned to a specific department.
     */
    public static function getFocalPersonByDepartment(int $departmentId)
    {
        return static::where('department_id', $departmentId)
            ->where('role', 'Focal Person')
            ->first();
    }

    /**
     * Override Laravel's default password column name.
     */
    public function getAuthPassword()
    {
        return $this->password_hash;
    }
}