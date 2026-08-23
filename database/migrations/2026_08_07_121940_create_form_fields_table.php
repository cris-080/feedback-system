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
        Schema::create('form_fields', function (Blueprint $table) {
            $table->integer('field_id', true);
            $table->integer('form_id')->index('form_id');
            $table->integer('step_number')->default(4);
            $table->string('field_label');
            $table->string('input_type', 50);
            $table->boolean('is_required')->nullable()->default(true);
            $table->integer('display_order')->nullable()->default(0);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('form_fields');
    }
};
