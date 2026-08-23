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
        Schema::table('feedback', function (Blueprint $table) {
            $table->foreign(['qr_id'], 'feedback_ibfk_1')->references(['qr_id'])->on('qr_code')->onUpdate('restrict')->onDelete('restrict');
            $table->foreign(['report_id'], 'fk_feedback_report')->references(['report_id'])->on('report')->onUpdate('cascade')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('feedback', function (Blueprint $table) {
            $table->dropForeign('feedback_ibfk_1');
            $table->dropForeign('fk_feedback_report');
        });
    }
};
