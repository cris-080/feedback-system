<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('department_positions')) {
            Schema::create('department_positions', function (Blueprint $table) {
                $table->id('position_id');
                $table->unsignedInteger('department_id');
                $table->string('position_name');
                $table->timestamps();

                $table->foreign('department_id')
                      ->references('department_id')
                      ->on('department')
                      ->onDelete('cascade');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('department_positions');
    }
};