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
        Schema::table('electronic_signature', function (Blueprint $table) {
            $table->foreign(['report_id'], 'electronic_signature_ibfk_1')->references(['report_id'])->on('report')->onUpdate('restrict')->onDelete('restrict');
            $table->foreign(['recipient_user_id'], 'electronic_signature_ibfk_2')->references(['user_id'])->on('account')->onUpdate('restrict')->onDelete('restrict');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('electronic_signature', function (Blueprint $table) {
            $table->dropForeign('electronic_signature_ibfk_1');
            $table->dropForeign('electronic_signature_ibfk_2');
        });
    }
};
