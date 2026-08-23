<?php

namespace Database\Seeders;

use App\Models\Account;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Run Role and Permission Seeders
        $this->call([
            RolesTableSeeder::class,
            PermissionsTableSeeder::class,
        ]);

                // Create / Update Default SuperAdmin User
        Account::updateOrCreate(
            ['email' => 'admin@clsu.edu.ph'],
            [
                'firstname'     => 'Super',
                'lastname'      => 'Admin',
                'username'      => 'superadmin',
                'email'         => 'admin@clsu.edu.ph',
                'password_hash' => Hash::make('password123'),
                'role'          => 'SuperAdmin',
                'role_id'       => 1, // Fix: SuperAdmin role_id is 1
                'department_id' => null,
            ]
        );
    }
}