<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('report', function (Blueprint $table) {
            $table->foreign(['department_id'], 'report_ibfk_1')->references(['department_id'])->on('department')->onUpdate('restrict')->onDelete('restrict');
            $table->foreign(['user_id'], 'report_ibfk_2')->references(['user_id'])->on('account')->onUpdate('restrict')->onDelete('restrict');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('report', function (Blueprint $table) {
            $table->dropForeign('report_ibfk_1');
            $table->dropForeign('report_ibfk_2');
        });
    }
};
