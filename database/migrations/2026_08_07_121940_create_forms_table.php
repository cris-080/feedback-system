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
        Schema::create('forms', function (Blueprint $table) {
            $table->integer('form_id', true);
            $table->string('form_group_id', 50)->nullable();
            $table->integer('version_number')->default(1);
            $table->string('title');
            $table->text('description')->nullable();
            $table->dateTime('created_at')->nullable()->useCurrent();
            $table->enum('status', ['Draft', 'Active', 'Archived'])->nullable()->default('Draft')->index('idx_forms_status');
            $table->integer('department_id')->nullable();
            $table->enum('form_type', ['CC', 'Non-CC'])->default('CC');
            $table->dateTime('updated_at')->useCurrentOnUpdate()->nullable()->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('forms');
    }
};
