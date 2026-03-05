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
        Schema::create('trx_audit_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('audit_period_id')->constrained('trx_audit_periods')->onDelete('cascade');
            $table->foreignId('unit_id')->constrained('ref_units')->onDelete('cascade');
            $table->enum('status', ['SCHEDULED', 'IN_PROGRESS', 'DESK_EVALUATION', 'FIELD_EVALUATION', 'COMPLETED'])->default('SCHEDULED');
            $table->date('scheduled_date')->nullable();
            $table->timestamps();

            // Satu unit hanya bisa diaudit satu kali per periode
            $table->unique(['audit_period_id', 'unit_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('trx_audit_schedules');
    }
};
