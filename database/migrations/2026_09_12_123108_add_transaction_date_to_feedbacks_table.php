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
        // 1. Corrected table name to 'feedback'
        Schema::table('feedback', function (Blueprint $table) {
            // 2. Placed it after a column that actually exists in your table
            $table->date('transaction_date')->after('form_id')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('feedback', function (Blueprint $table) {
            $table->dropColumn('transaction_date');
        });
    }
};