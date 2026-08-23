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
        Schema::table('feedback_answers', function (Blueprint $table) {
            $table->foreign(['response_id'], 'feedback_answers_ibfk_1')->references(['response_id'])->on('feedback')->onUpdate('restrict')->onDelete('cascade');
            $table->foreign(['field_id'], 'feedback_answers_ibfk_2')->references(['field_id'])->on('form_fields')->onUpdate('restrict')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('feedback_answers', function (Blueprint $table) {
            $table->dropForeign('feedback_answers_ibfk_1');
            $table->dropForeign('feedback_answers_ibfk_2');
        });
    }
};
