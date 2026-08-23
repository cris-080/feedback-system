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
        Schema::create('report', function (Blueprint $table) {
            $table->integer('report_id', true);
            $table->string('month', 20);
            $table->integer('year');
            $table->text('summary')->nullable();
            $table->string('status', 50)->nullable();
            $table->dateTime('generated_at')->nullable()->useCurrent();
            $table->integer('department_id')->nullable()->index('department_id');
            $table->integer('user_id')->nullable()->index('user_id');
            $table->dateTime('updated_at')->useCurrentOnUpdate()->nullable()->useCurrent();
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
