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
        Schema::table('department_services', function (Blueprint $table) {
            $table->foreign(['department_id'], 'department_services_ibfk_1')->references(['department_id'])->on('department')->onUpdate('restrict')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('department_services', function (Blueprint $table) {
            $table->dropForeign('department_services_ibfk_1');
        });
    }
};
