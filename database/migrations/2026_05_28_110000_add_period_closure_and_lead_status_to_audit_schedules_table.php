<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('audit_schedules', function (Blueprint $table) {
            $table->string('lead_auditor_status', 20)->default('PENDING')->after('notes');
            $table->text('lead_auditor_response_note')->nullable()->after('lead_auditor_status');
            $table->timestamp('lead_auditor_responded_at')->nullable()->after('lead_auditor_response_note');
            $table->string('audit_period_status', 20)->default('OPEN')->after('overall_status');
            $table->text('audit_period_conclusion')->nullable()->after('audit_period_status');
            $table->timestamp('audit_period_closed_at')->nullable()->after('audit_period_conclusion');
            $table->foreignId('audit_period_closed_by')->nullable()->after('audit_period_closed_at')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('audit_schedules', function (Blueprint $table) {
            $table->dropConstrainedForeignId('audit_period_closed_by');
            $table->dropColumn([
                'lead_auditor_status',
                'lead_auditor_response_note',
                'lead_auditor_responded_at',
                'audit_period_status',
                'audit_period_conclusion',
                'audit_period_closed_at',
            ]);
        });
    }
};
