<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
   public function up()
    {
        Schema::create('reports', function (Blueprint $table) {
            $table->id('report_id');
            $table->unsignedBigInteger('department_id')->nullable(); // Null means Global/All Departments
            $table->string('report_type'); // 'cc' or 'non-cc'
            $table->integer('month');
            $table->integer('year');
            $table->json('report_data'); // This will store the exact math snapshot!
            $table->unsignedBigInteger('generated_by'); // Who generated it
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('report');
    }
};
