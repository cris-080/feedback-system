<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('account', function (Blueprint $table) {
            if (!Schema::hasColumn('account', 'is_root')) {
                // Change 'is_system' to an existing column on the account table like 'remember_token' or 'role_id'
                $table->boolean('is_root')->default(0)->after('remember_token');
            }
        });
    }

    public function down(): void
    {
        Schema::table('account', function (Blueprint $table) {
            if (Schema::hasColumn('account', 'is_root')) {
                $table->dropColumn('is_root');
            }
        });
    }
};