<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('audit_schedules', function (Blueprint $table) {
            $table->string('audit_period_lead_status', 20)->default('PENDING')->after('audit_period_status');
            $table->timestamp('audit_period_lead_approved_at')->nullable()->after('audit_period_lead_status');
            $table->string('audit_period_auditor_status', 20)->default('PENDING')->after('audit_period_lead_approved_at');
            $table->timestamp('audit_period_auditor_approved_at')->nullable()->after('audit_period_auditor_status');
        });
    }

    public function down(): void
    {
        Schema::table('audit_schedules', function (Blueprint $table) {
            $table->dropColumn([
                'audit_period_lead_status',
                'audit_period_lead_approved_at',
                'audit_period_auditor_status',
                'audit_period_auditor_approved_at',
            ]);
        });
    }
};
