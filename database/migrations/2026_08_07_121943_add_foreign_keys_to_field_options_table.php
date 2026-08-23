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
        Schema::table('field_options', function (Blueprint $table) {
            $table->foreign(['field_id'], 'field_options_ibfk_1')->references(['field_id'])->on('form_fields')->onUpdate('restrict')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('field_options', function (Blueprint $table) {
            $table->dropForeign('field_options_ibfk_1');
        });
    }
};
