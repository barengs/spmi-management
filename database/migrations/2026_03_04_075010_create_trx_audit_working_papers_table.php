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
        Schema::create('trx_audit_working_papers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('audit_schedule_id')->constrained('trx_audit_schedules')->onDelete('cascade');
            $table->foreignId('metric_target_id')->constrained('metric_targets')->onDelete('cascade');
            $table->decimal('auditor_score', 4, 2)->nullable();
            $table->enum('status', ['SESUAI', 'OB', 'KTS_MINOR', 'KTS_MAYOR', 'MELAMPAUI'])->nullable();
            $table->text('auditor_notes')->nullable();
            $table->timestamps();

            $table->unique(['audit_schedule_id', 'metric_target_id'], 'awp_schedule_metric_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('trx_audit_working_papers');
    }
};
