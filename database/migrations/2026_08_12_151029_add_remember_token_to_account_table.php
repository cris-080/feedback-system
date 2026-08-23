<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('account', function (Blueprint $table) {
            if (!Schema::hasColumn('account', 'remember_token')) {
                $table->rememberToken()->after('role_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('account', function (Blueprint $table) {
            $table->dropColumn('remember_token');
        });
    }
};