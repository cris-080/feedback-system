<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->integer('role_id')->autoIncrement();
            $table->string('role_name', 50)->unique();
            $table->string('role_key', 50)->unique();
            $table->string('description', 255)->nullable();
            $table->boolean('is_system')->default(0);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('roles');
    }
};