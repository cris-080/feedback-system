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
        Schema::create('approved_report_distribution', function (Blueprint $table) {
            $table->integer('distribution_id', true);
            $table->string('recipient_type', 100)->nullable();
            $table->dateTime('distribited_at')->nullable();
            $table->integer('report_id')->nullable()->index('report_id');
            $table->integer('recipient_user_id')->nullable()->index('recipient_user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('approved_report_distribution');
    }
};
