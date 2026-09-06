<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_providers', function (Blueprint $table) {
            $table->id('provider_id');
            
            // Signed integer to match department_id int(11)
            $table->integer('department_id');
            
            $table->string('name');
            $table->string('position')->nullable();
            $table->timestamps();

            $table->foreign('department_id')
                  ->references('department_id')
                  ->on('department')
                  ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_providers');
    }
};