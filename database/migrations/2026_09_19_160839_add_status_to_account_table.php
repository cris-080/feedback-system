<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('account', function (Blueprint $table) {
            // Adds the status column and defaults everyone to 'Active'
            $table->string('status')->default('Active')->after('role'); 
        });
    }

    public function down()
    {
        Schema::table('account', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }
};