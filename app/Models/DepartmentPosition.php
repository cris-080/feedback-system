<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DepartmentPosition extends Model
{
    protected $table = 'department_positions';
    protected $primaryKey = 'position_id';

    protected $fillable = [
        'department_id',
        'position_name',
    ];

    public function department()
    {
        return $this->belongsTo(Department::class, 'department_id', 'department_id');
    }

    /**
     * Bulk assign a position name to multiple departments.
     * Business logic belongs here in the model.
     *
     * @param array $departmentIds
     * @param string $positionName
     * @return void
     */
    public static function bulkAssignPositions(array $departmentIds, string $positionName): void
    {
        $positionName = trim($positionName);
        
        foreach ($departmentIds as $deptId) {
            self::firstOrCreate([
                'department_id' => $deptId,
                'position_name' => $positionName,
            ]);
        }
    }

    public static function getByDepartment($departmentId)
{
    return self::where('department_id', $departmentId)
        ->orderBy('position_name', 'asc')
        ->get(['position_id', 'position_name']);
}
}