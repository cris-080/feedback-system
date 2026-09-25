<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->unsignedBigInteger('department_id')->nullable()->after('id');
            $table->string('report_type')->default('cc')->after('department_id');
            $table->integer('month')->after('report_type');
            $table->integer('year')->after('month');
            $table->json('report_data')->after('year');
            $table->unsignedBigInteger('generated_by')->nullable()->after('report_data');
        });
    }

    public function down(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->dropColumn(['department_id', 'report_type', 'month', 'year', 'report_data', 'generated_by']);
        });
    }
};