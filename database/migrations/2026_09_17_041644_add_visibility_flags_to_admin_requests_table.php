<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
{
    Schema::table('admin_requests', function (Blueprint $table) {
        $table->boolean('is_cleared_by_superadmin')->default(false);
        $table->boolean('is_cleared_by_committee')->default(false);
    });
}

    /**
     * Reverse the migrations.
     */
    public function down()
{
    Schema::table('admin_requests', function (Blueprint $table) {
        $table->dropColumn(['is_cleared_by_superadmin', 'is_cleared_by_committee']);
    });
}

};


