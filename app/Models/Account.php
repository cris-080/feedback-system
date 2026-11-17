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
            ->when(!empty($filters['search']), function ($q) use ($filters) {
                $trimmed = trim($filters['search']);
                $like = '%' . $trimmed . '%';

                $q->where(function ($sub) use ($like) {
                    $sub->where('account.firstname', 'LIKE', $like)
                        ->orWhere('account.lastname', 'LIKE', $like)
                        ->orWhereRaw("CONCAT(account.firstname, ' ', account.lastname) LIKE ?", [$like])
                        ->orWhere('account.email', 'LIKE', $like)
                        ->orWhere('account.username', 'LIKE', $like)
                        ->orWhere('account.role', 'LIKE', $like)
                        ->orWhere('department.department_name', 'LIKE', $like)
                        ->orWhere('account.status', 'LIKE', $like);
                });
            })
            ->when(!empty($filters['role']), function ($q) use ($filters) {
                $q->where('account.role', $filters['role']);
            })
            ->when(!empty($filters['department']), function ($q) use ($filters) {
                if ($filters['department'] === 'unassigned') {
                    $q->whereNull('account.department_id');
                } else {
                    $q->where('department.department_name', $filters['department']);
                }
            });
    }

    /**
     * Local scope to handle archived account filtering.
     */
    public function scopeArchivedFiltered($query, array $filters)
    {
        $query->onlyTrashed();
        
        $query->when($filters['search'] ?? null, function ($q, $search) {
            $like = '%' . trim($search) . '%';
            $q->where(function ($sq) use ($like) {
                $sq->where('firstname', 'LIKE', $like)
                  ->orWhere('lastname', 'LIKE', $like)
                  ->orWhereRaw("CONCAT(firstname, ' ', lastname) LIKE ?", [$like])
                  ->orWhere('email', 'LIKE', $like)
                  ->orWhere('role', 'LIKE', $like)
                  ->orWhere('deleted_at', 'LIKE', $like)
                  ->orWhereRaw("DATE_FORMAT(deleted_at, '%b %e, %Y') LIKE ?", [$like]);
            });
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

   public function toggleSuspension(?string $reason = null): string
    {
        if ($this->status === 'Suspended') {
            $this->status = 'Active';
            $this->suspension_reason = null;
            $action = 'Restored';
        } else {
            $this->status = 'Suspended';
            $this->suspension_reason = $reason ?? 'Violation of system policies.';
            $action = 'Suspended';
        }
        $this->save();
        
        return $action;
    }

    public function resetToDefaultPassword(): void
    {
        $this->password_hash = Hash::make('Password123!');
        $this->save();
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