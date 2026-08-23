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
        Schema::table('sentiment_analysis', function (Blueprint $table) {
            $table->foreign(['response_id'], 'sentiment_analysis_ibfk_1')->references(['response_id'])->on('feedback')->onUpdate('restrict')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sentiment_analysis', function (Blueprint $table) {
            $table->dropForeign('sentiment_analysis_ibfk_1');
        });
    }
};
