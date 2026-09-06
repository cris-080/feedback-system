<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ServiceProvider extends Model
{
    protected $table = 'service_providers';
    protected $primaryKey = 'provider_id';

    protected $fillable = [
        'department_id',
        'name',
        'position',
    ];

    public function department()
    {
        return $this->belongsTo(Department::class, 'department_id', 'department_id');
    }
}