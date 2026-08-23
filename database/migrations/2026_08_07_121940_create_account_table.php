<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('account', function (Blueprint $table) {
            $table->integer('user_id', true);
            $table->string('firstname', 100);
            $table->string('lastname', 100);
            $table->string('username', 100)->unique('username');
            $table->string('password_hash');
            $table->string('email')->unique('email');
            $table->string('role', 50);
            $table->boolean('is_active')->nullable()->default(true);
            $table->dateTime('last_login')->nullable();
            $table->integer('department_id')->nullable()->index('department_id');
            $table->dateTime('updated_at')->useCurrentOnUpdate()->nullable()->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('account');
    }
};
