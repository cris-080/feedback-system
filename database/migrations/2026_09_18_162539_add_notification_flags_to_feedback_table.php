<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('feedback', function (Blueprint $table) {
            $table->boolean('is_notified_superadmin')->default(false)->after('status');
            $table->boolean('is_notified_committee')->default(false)->after('is_notified_superadmin');
        });
    }

    public function down()
    {
        Schema::table('feedback', function (Blueprint $table) {
            $table->dropColumn(['is_notified_superadmin', 'is_notified_committee']);
        });
    }
};
