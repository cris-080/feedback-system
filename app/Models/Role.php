<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    protected $table = 'roles';
    protected $primaryKey = 'role_id';
    public $timestamps = false;

    protected $fillable = ['role_name', 'role_key', 'description', 'is_system'];

    public function accounts()
    {
        return $this->hasMany(Account::class, 'role_id', 'role_id');
    }

    public function permissions()
    {
        return $this->belongsToMany(
            Permission::class,
            'role_permissions',
            'role_id',
            'permission_id'
        );
    }

    // --- FAT MODEL METHODS ---

            public static function getAllRolesWithCounts()
        {
            return self::select(
                    'roles.role_id',
                    'roles.role_name',
                    'roles.role_key',
                    'roles.description',
                    'roles.is_system'
                )
                ->selectRaw('COUNT(account.user_id) as accounts_count')
                ->leftJoin('account', function($join) {
                    $join->on('account.role_id', '=', 'roles.role_id');
                })
                ->groupBy(
                    'roles.role_id',
                    'roles.role_name',
                    'roles.role_key',
                    'roles.description',
                    'roles.is_system'
                )
                ->orderBy('roles.is_system', 'desc')
                ->orderBy('roles.role_name', 'asc')
                ->get();
        }
}