<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{public function up()
{
    // Ensure the table name exactly matches your database (e.g., 'forms' or 'form')
    Schema::table('forms', function (Blueprint $table) {
        $table->softDeletes();
    });
}

public function down()
{
    Schema::table('forms', function (Blueprint $table) {
        $table->dropSoftDeletes();
    });
}
};
