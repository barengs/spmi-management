<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mst_standards', function (Blueprint $table) {
            $table->string('approval_stage', 50)->default('DRAFT')->after('status');
            $table->foreignId('head_lpmi_approved_by')->nullable()->after('review_submitted_at')->constrained('users')->nullOnDelete();
            $table->timestamp('head_lpmi_approved_at')->nullable()->after('head_lpmi_approved_by');
            $table->foreignId('wr1_approved_by')->nullable()->after('head_lpmi_approved_at')->constrained('users')->nullOnDelete();
            $table->timestamp('wr1_approved_at')->nullable()->after('wr1_approved_by');
            $table->foreignId('wr2_approved_by')->nullable()->after('wr1_approved_at')->constrained('users')->nullOnDelete();
            $table->timestamp('wr2_approved_at')->nullable()->after('wr2_approved_by');
            $table->foreignId('wr3_approved_by')->nullable()->after('wr2_approved_at')->constrained('users')->nullOnDelete();
            $table->timestamp('wr3_approved_at')->nullable()->after('wr3_approved_by');
            $table->foreignId('rector_approved_by')->nullable()->after('wr3_approved_at')->constrained('users')->nullOnDelete();
            $table->timestamp('rector_approved_at')->nullable()->after('rector_approved_by');
        });
    }

    public function down(): void
    {
        Schema::table('mst_standards', function (Blueprint $table) {
            $table->dropForeign(['head_lpmi_approved_by']);
            $table->dropForeign(['wr1_approved_by']);
            $table->dropForeign(['wr2_approved_by']);
            $table->dropForeign(['wr3_approved_by']);
            $table->dropForeign(['rector_approved_by']);
            $table->dropColumn([
                'approval_stage',
                'head_lpmi_approved_by',
                'head_lpmi_approved_at',
                'wr1_approved_by',
                'wr1_approved_at',
                'wr2_approved_by',
                'wr2_approved_at',
                'wr3_approved_by',
                'wr3_approved_at',
                'rector_approved_by',
                'rector_approved_at',
            ]);
        });
    }
};
