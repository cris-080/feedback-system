<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
   public function up()
{
    Schema::table('admin_requests', function (Blueprint $table) {
        $table->string('recipient')->default('SuperAdmin')->after('admin_id');
    });
}

public function down()
{
    Schema::table('admin_requests', function (Blueprint $table) {
        $table->dropColumn('recipient');
    });
}
};
