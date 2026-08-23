<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PermissionsTableSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            // Forms Module
            ['module' => 'Forms', 'permission_key' => 'forms.create', 'display_name' => 'Create Forms', 'description' => 'Build new evaluation blueprints'],
            ['module' => 'Forms', 'permission_key' => 'forms.edit', 'display_name' => 'Edit Forms', 'description' => 'Modify active or draft form structures'],
            ['module' => 'Forms', 'permission_key' => 'forms.publish', 'display_name' => 'Publish Forms', 'description' => 'Make forms live on the public portal'],
            ['module' => 'Forms', 'permission_key' => 'forms.archive', 'display_name' => 'Archive Forms', 'description' => 'Hide forms from public view'],

            // User Accounts Module
            ['module' => 'Accounts', 'permission_key' => 'users.create', 'display_name' => 'Add Users', 'description' => 'Create new department accounts'],
            ['module' => 'Accounts', 'permission_key' => 'users.edit', 'display_name' => 'Edit Users', 'description' => 'Modify user credentials and assigned roles'],
            ['module' => 'Accounts', 'permission_key' => 'users.suspend', 'display_name' => 'Suspend Access', 'description' => 'Revoke user login privileges'],
            ['module' => 'Accounts', 'permission_key' => 'users.delete', 'display_name' => 'Delete Users', 'description' => 'Permanently delete user records'],

            // Department Module
            ['module' => 'Departments', 'permission_key' => 'departments.manage', 'display_name' => 'Manage Departments', 'description' => 'Add or edit university departments'],

            // System Reports & Analytics
            ['module' => 'Reports', 'permission_key' => 'reports.view', 'display_name' => 'View System Analytics', 'description' => 'Access system-wide sentiment reports'],
            ['module' => 'Reports', 'permission_key' => 'reports.export', 'display_name' => 'Export Reports', 'description' => 'Download feedback data in PDF/CSV format'],
        ];

        foreach ($permissions as $perm) {
            DB::table('permissions')->updateOrInsert(
                ['permission_key' => $perm['permission_key']],
                $perm
            );
        }
    }
}