<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('permissions', function (Blueprint $table) {
            $table->id('permission_id');
            $table->string('module', 50);          // e.g., 'Forms', 'Accounts', 'Departments'
            $table->string('permission_key', 50)->unique(); // e.g., 'forms.create', 'users.delete'
            $table->string('display_name', 100);
            $table->string('description')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('permissions');
    }
};