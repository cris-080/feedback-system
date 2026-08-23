<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;

class RolesTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $roles = [
            [
                'role_key'    => 'superadmin',
                'role_name'   => 'SuperAdmin',
                'description' => 'System Administrator with full access to all modules, configurations, and user management.',
                'is_system'   => 1,
            ],
            [
                'role_key'    => 'feedback_committee',
                'role_name'   => 'Feedback Committee',
                'description' => 'Generates system-wide analytics, reviews performance reports, and submits admin requests.',
                'is_system'   => 1,
            ],
            [
                'role_key'    => 'focal_person',
                'role_name'   => 'Focal Person',
                'description' => 'Department-level manager responsible for viewing department ratings and managing service lists.',
                'is_system'   => 1,
            ],
        ];

        foreach ($roles as $role) {
            Role::firstOrCreate(
                ['role_key' => $role['role_key']],
                $role
            );
        }
    }
}