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
        Schema::table('qr_code', function (Blueprint $table) {
            $table->foreign(['department_id'], 'qr_code_ibfk_1')->references(['department_id'])->on('department')->onUpdate('restrict')->onDelete('restrict');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('qr_code', function (Blueprint $table) {
            $table->dropForeign('qr_code_ibfk_1');
        });
    }
};
