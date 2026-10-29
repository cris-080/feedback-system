<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
   public function up()
{
    Schema::table('reports', function (Blueprint $table) {
        // Defaults to Draft. Other states: 'Submitted', 'Approved', 'Returned'
        $table->string('status')->default('Draft')->after('export_format'); 
    });
}

public function down()
{
    Schema::table('reports', function (Blueprint $table) {
        $table->dropColumn('status');
    });
}
};
