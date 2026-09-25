<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
   public function up()
    {
        Schema::table('admin_requests', function (Blueprint $table) {
            // These flags will ONLY be used for the notification bell
            $table->boolean('is_notified_superadmin')->default(false)->after('is_cleared_by_superadmin');
            $table->boolean('is_notified_committee')->default(false)->after('is_cleared_by_committee');
        });
    }

    public function down()
    {
        Schema::table('admin_requests', function (Blueprint $table) {
            $table->dropColumn(['is_notified_superadmin', 'is_notified_committee']);
        });
    }
};
