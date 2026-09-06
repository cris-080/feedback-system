<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Account;
use App\Models\DepartmentPosition;
use App\Models\DepartmentService;
use App\Models\ServiceProvider;
use Illuminate\Database\Eloquent\SoftDeletes;

class Department extends Model
{    
    use SoftDeletes;
    
    protected $table = 'department';
    protected $primaryKey = 'department_id';
    
    public $timestamps = false; 

    protected $fillable = ['department_name', 'description', 'focal_person_id'];

    // --- RELATIONSHIPS ---

    public function accounts()
    {
        return $this->hasMany(Account::class, 'department_id', 'department_id');
    }

    public function services()
    {
        return $this->hasMany(DepartmentService::class, 'department_id', 'department_id');
    }

    public function positions()
    {
        return $this->hasMany(DepartmentPosition::class, 'department_id', 'department_id');
    }

    public function serviceProviders()
    {
        return $this->hasMany(ServiceProvider::class, 'department_id', 'department_id');
    }

    // Alias to match the frontend `dept.service_providers` prop
    public function service_providers()
    {
        return $this->hasMany(ServiceProvider::class, 'department_id', 'department_id');
    }

    public function focalPerson()
    {
        return $this->belongsTo(Account::class, 'focal_person_id', 'user_id');
    }

    // Alias to match the frontend `dept.focal_person` prop
    public function focal_person()
    {
        return $this->belongsTo(Account::class, 'focal_person_id', 'user_id');
    }

    // --- SCOPES ---

    public function scopeSearch($query, $search)
    {
        if ($search) {
            $query->where('department_name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhereHas('services', function($q) use ($search) {
                      $q->where('service_name', 'like', "%{$search}%");
                  });
        }
    }

    // --- FAT MODEL METHODS (For Thin Controllers) ---

    /**
     * Retrieve paginated departments with all necessary relationships eager loaded.
     */
    public static function getPaginatedWithRelations(?string $search = null, int $perPage = 10)
    {
        return self::with(['services', 'positions', 'service_providers', 'focal_person'])
            ->search($search)
            ->latest('department_id')
            ->paginate($perPage)
            ->withQueryString();
    }

    public static function createDepartment(array $data)
    {
        $department = self::create([
            'department_name' => $data['department_name'],
            'description'     => $data['description'] ?? '',
            'focal_person_id' => $data['focal_person_id'] ?? null,
        ]);

        if ($department->focal_person_id) {
            Account::where('user_id', $department->focal_person_id)
                   ->update(['department_id' => $department->department_id]);
        }

        return $department;
    }

    public function updateDepartment(array $data)
    {
        $this->update([
            'department_name' => $data['department_name'],
            'description'     => $data['description'] ?? '',
            'focal_person_id' => $data['focal_person_id'] ?? null,
        ]);

        if ($this->focal_person_id) {
            Account::where('user_id', $this->focal_person_id)
                   ->update(['department_id' => $this->department_id]);
        }

        return $this;
    }

    public static function getNameOrDefault($departmentId)
    {
        $department = self::select('department_name')
            ->where('department_id', $departmentId)
            ->first();

        return $department ? $department->department_name : 'General';
    }

    public static function getDropdownList()
    {
        return self::orderBy('department_name', 'asc')
            ->get(['department_id', 'department_name']); 
    }

    public static function getTotalCount()
    {
        return self::count();
    }
}