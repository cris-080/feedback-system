<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('account', function (Blueprint $table) {
            if (!Schema::hasColumn('account', 'role_id')) {
                $table->integer('role_id')->nullable()->after('role');
                $table->foreign('role_id')
                      ->references('role_id')
                      ->on('roles')
                      ->onDelete('set null');
            }
        });
    }

    public function down(): void
    {
        Schema::table('account', function (Blueprint $table) {
            $table->dropForeign(['role_id']);
            $table->dropColumn('role_id');
        });
    }
};