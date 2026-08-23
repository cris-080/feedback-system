<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('qr_code', function (Blueprint $table) {
            $table->id('qr_id'); 
            $table->string('qr_token')->unique(); // The 40-character secure string
            $table->string('label'); // E.g., "Registrar Window 1"
            $table->boolean('is_active')->default(true); // 1 = active, 0 = disabled
            $table->integer('department_id');
            
            // Custom Timestamps
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('expires_at')->nullable(); 

            // Foreign Key Constraint to link it to the department table
            $table->foreign('department_id')
                  ->references('department_id')
                  ->on('department') // Assuming your table is named 'department' based on earlier controllers
                  ->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::dropIfExists('qr_code');
    }
};