<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('forms', function (Blueprint $table) {
            $table->string('header_1')->default('Republic of the Philippines')->nullable();
            $table->string('header_2')->default('CENTRAL LUZON STATE UNIVERSITY')->nullable();
            $table->string('header_3')->default('Science City of Muñoz, Nueva Ecija')->nullable();
            $table->string('tagline')->default('HELP US SERVE YOU BETTER!')->nullable();
        });
    }

    public function down()
    {
        Schema::table('forms', function (Blueprint $table) {
            $table->dropColumn(['header_1', 'header_2', 'header_3', 'tagline']);
        });
    }
};

