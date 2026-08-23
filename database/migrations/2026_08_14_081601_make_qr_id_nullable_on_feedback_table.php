<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('feedback', function (Blueprint $table) {
            // This explicitly tells Laravel that it is okay for an emailed link to have NO QR Code attached
            $table->unsignedBigInteger('qr_id')->nullable()->change();
        });
    }

    public function down()
    {
        Schema::table('feedback', function (Blueprint $table) {
            $table->unsignedBigInteger('qr_id')->nullable(false)->change();
        });
    }
};