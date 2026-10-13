<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            // Drop old integer columns
            $table->dropColumn(['month', 'year']);
            
            // Add new date range and format columns
            $table->date('start_date')->after('report_type')->nullable();
            $table->date('end_date')->after('start_date')->nullable();
            $table->string('export_format')->after('end_date')->default('pdf');
        });
    }

    public function down(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->dropColumn(['start_date', 'end_date', 'export_format']);
            $table->integer('month')->after('report_type');
            $table->integer('year')->after('month');
        });
    }
};