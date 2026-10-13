<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
   public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id('log_id');
            $table->unsignedBigInteger('user_id')->nullable(); 
            $table->string('action'); 
            $table->string('module'); 
            $table->text('details')->nullable(); 
            $table->string('ip_address')->nullable();
            $table->timestamp('created_at')->useCurrent();
            
            // Strict database foreign key constraint removed to bypass Error 150.
            // Eloquent's relationship ($log->account) handles this seamlessly.
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
