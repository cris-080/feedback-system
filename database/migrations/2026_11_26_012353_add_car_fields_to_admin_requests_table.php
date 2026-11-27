<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Ensure recipient and status accept 'Focal Person', 'Addressed', and 'Closed' even if previously ENUM
        DB::statement("ALTER TABLE admin_requests MODIFY recipient VARCHAR(50) NOT NULL DEFAULT 'SuperAdmin'");
        DB::statement("ALTER TABLE admin_requests MODIFY status VARCHAR(30) NOT NULL DEFAULT 'Pending'");

        Schema::table('admin_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('admin_requests', 'target_department_id')) {
                $table->unsignedBigInteger('target_department_id')->nullable()->after('recipient');
            }
            if (!Schema::hasColumn('admin_requests', 'priority')) {
                $table->string('priority', 20)->default('Normal')->after('request_type');
            }
            if (!Schema::hasColumn('admin_requests', 'due_date')) {
                $table->date('due_date')->nullable()->after('priority');
            }
            if (!Schema::hasColumn('admin_requests', 'fp_response')) {
                $table->text('fp_response')->nullable()->after('remarks');
            }
            if (!Schema::hasColumn('admin_requests', 'is_notified_focal')) {
                $table->boolean('is_notified_focal')->default(false)->after('is_notified_committee');
            }
        });
    }

    public function down(): void
    {
        Schema::table('admin_requests', function (Blueprint $table) {
            foreach (['target_department_id', 'priority', 'due_date', 'fp_response', 'is_notified_focal'] as $col) {
                if (Schema::hasColumn('admin_requests', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};