<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
   public function up(): void
{
    Schema::table('department', function (Blueprint $table) {
        // Adds the column, making it nullable in case some departments don't have one yet
        $table->string('focal_person_email')->nullable()->after('department_name');
    });
}

public function down(): void
{
    Schema::table('department', function (Blueprint $table) {
        $table->dropColumn('focal_person_email');
    });
}
};
