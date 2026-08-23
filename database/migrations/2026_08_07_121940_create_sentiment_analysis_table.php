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
        Schema::create('sentiment_analysis', function (Blueprint $table) {
            $table->integer('sentiment_id', true);
            $table->string('sentiment', 50);
            $table->decimal('confidence_score', 5, 4)->nullable();
            $table->dateTime('analyzed_at')->nullable()->useCurrent();
            $table->integer('response_id')->nullable()->index('response_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sentiment_analysis');
    }
};
