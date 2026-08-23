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
        Schema::create('feedback', function (Blueprint $table) {
            $table->integer('response_id', true);
            $table->string('control_number', 100)->nullable()->unique('control_number');
            $table->string('email_address')->nullable();
            $table->dateTime('submitted_at')->nullable()->useCurrent();
            $table->integer('qr_id')->nullable()->index('qr_id');
            $table->integer('report_id')->nullable()->index('fk_feedback_report');
            $table->integer('form_id')->nullable()->default(1);
            $table->enum('status', ['Valid', 'Spam', 'Archived'])->default('Valid')->index('idx_feedback_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('feedback');
    }
};
