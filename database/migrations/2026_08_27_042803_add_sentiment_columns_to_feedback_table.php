<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('feedback', function (Blueprint $table) {
            // Adds the sentiment label (e.g., "Positive", "Negative", "Neutral")
            $table->string('sentiment')->nullable(); 
            
            // Adds the confidence score as a decimal (e.g., 0.9850 for 98.5%)
            $table->decimal('sentiment_score', 5, 4)->nullable(); 
        });
    }

    public function down()
    {
        Schema::table('feedback', function (Blueprint $table) {
            $table->dropColumn(['sentiment', 'sentiment_score']);
        });
    }
};