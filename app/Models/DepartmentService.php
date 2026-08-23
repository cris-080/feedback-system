<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DepartmentService extends Model
{
    protected $table = 'department_services';
    protected $primaryKey = 'service_id';
    public $timestamps = false; // Add if you don't use created_at/updated_at here

    protected $fillable = ['department_id', 'service_name'];

    public function department()
    {
        return $this->belongsTo(Department::class, 'department_id', 'department_id');
    }
    /**
     * Retrieve services grouped by department ID for the frontend map.
     */
    public static function getGroupedServices()
    {
        return self::orderBy('service_name', 'asc')
            ->get(['department_id', 'service_name'])
            ->groupBy('department_id')
            ->map(fn($items) => $items->pluck('service_name'))
            ->toArray();
    }

    public static function getTotalCount()
    {
        return self::count();
    }
}