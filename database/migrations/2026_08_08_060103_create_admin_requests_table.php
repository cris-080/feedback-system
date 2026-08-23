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
        Schema::create('admin_requests', function (Blueprint $table) {
            $table->id('request_id'); 
            
            // FIX: Changed to a standard signed integer to match phpMyAdmin's default INT
            $table->integer('admin_id'); 
            
            $table->string('request_type');
            $table->text('details');
            $table->string('status')->default('Pending');
            $table->timestamps();

            // Foreign Key Constraint
            $table->foreign('admin_id')
                  ->references('user_id')
                  ->on('account')
                  ->onDelete('cascade');
        });
    }
    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('admin_requests');
    }
};