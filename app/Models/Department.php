<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Account; // NEW: Import Account for auto-sync

class Department extends Model
{
    protected $table = 'department';
    protected $primaryKey = 'department_id';
    public $timestamps = false; 

    protected $fillable = ['department_name', 'description', 'focal_person_id'];

    public function accounts()
    {
        return $this->hasMany(Account::class, 'department_id', 'department_id');
    }

    public function services()
    {
        return $this->hasMany(DepartmentService::class, 'department_id', 'department_id');
    }

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

    public static function createDepartment(array $data)
    {
        $department = self::create([
            'department_name' => $data['department_name'],
            'description'     => $data['description'] ?? '',
            'focal_person_id' => $data['focal_person_id'] ?? null,
        ]);

        // --- FAT MODEL: Bidirectional Auto-Sync ---
        // If a focal person was assigned, update that user's account to belong to this department
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

        // --- FAT MODEL: Bidirectional Auto-Sync ---
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

    // Connects the department to the specific user account
    public function focalPerson()
    {
        return $this->belongsTo(Account::class, 'focal_person_id', 'user_id');
    }
}