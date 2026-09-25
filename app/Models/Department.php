<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Account;
use App\Models\DepartmentPosition;
use App\Models\DepartmentService;
use App\Models\ServiceProvider;
use \Illuminate\Support\Facades\DB;
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
     * ADDED: $status filter for Assigned/Unassigned Focal Persons.
     */
    public static function getPaginatedWithRelations(?string $search = null, string $status = 'all', int $perPage = 10)
    {
        $query = self::with(['services', 'positions', 'service_providers', 'focal_person'])
            ->search($search);

        // Apply Focal Person Assignment Filter
        if ($status === 'assigned') {
            $query->has('focal_person');
        } elseif ($status === 'unassigned') {
            $query->doesntHave('focal_person');
        }

        return $query->latest('department_id')
            ->paginate($perPage)
            ->withQueryString();
    }


    /**
     * FAT MODEL: Handles the creation of the Department AND all its initial child configurations.
     */
    public static function createDepartment(array $data)
    {
        // 1. Create the parent Department
        $department = self::create([
            'department_name' => trim($data['name'] ?? $data['department_name']),
            'description'     => trim($data['description'] ?? ''),
            'focal_person_id' => $data['focal_person_id'] ?? null,
        ]);

        if ($department->focal_person_id) {
            Account::where('user_id', $department->focal_person_id)
                   ->update(['department_id' => $department->department_id]);
        }

        // 2. Quick Add Services
        if (!empty($data['initial_services'])) {
            $services = array_filter(array_map('trim', explode(',', $data['initial_services'])));
            $serviceData = [];
            foreach ($services as $service) {
                $serviceData[] = ['department_id' => $department->department_id, 'service_name' => $service];
            }
            if (!empty($serviceData)) {
                DB::table('department_services')->insert($serviceData);
            }
        }

        // 3. Quick Add Positions
        if (!empty($data['initial_positions'])) {
            $positions = array_filter(array_map('trim', explode(',', $data['initial_positions'])));
            $positionData = [];
            foreach ($positions as $position) {
                $positionData[] = ['department_id' => $department->department_id, 'position_name' => $position];
            }
            if (!empty($positionData)) {
                DB::table('department_positions')->insert($positionData);
            }
        }

        // 4. Quick Add Providers
        if (!empty($data['initial_providers'])) {
            $providers = array_filter(array_map('trim', explode(',', $data['initial_providers'])));
            $providerData = [];
            foreach ($providers as $provider) {
                $providerData[] = ['department_id' => $department->department_id, 'name' => $provider, 'position' => null];
            }
            if (!empty($providerData)) {
                DB::table('service_providers')->insert($providerData);
            }
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