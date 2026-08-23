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
        Schema::create('electronic_signature', function (Blueprint $table) {
            $table->integer('signature_id', true);
            $table->string('signatory_role', 100)->nullable();
            $table->integer('signing_order')->nullable();
            $table->binary('signature_image')->nullable();
            $table->dateTime('signed_at')->nullable();
            $table->string('status', 50)->nullable();
            $table->integer('report_id')->nullable()->index('report_id');
            $table->integer('recipient_user_id')->nullable()->index('recipient_user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('electronic_signature');
    }
};
