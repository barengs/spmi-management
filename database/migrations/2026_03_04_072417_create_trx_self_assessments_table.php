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
        Schema::create('trx_self_assessments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('unit_id')->constrained('ref_units')->onDelete('cascade');
            $table->foreignId('metric_target_id')->constrained('metric_targets')->onDelete('cascade');
            $table->decimal('claimed_score', 8, 2)->nullable();
            $table->text('success_analysis')->nullable();
            $table->text('failure_analysis')->nullable();
            $table->string('status')->default('DRAFT'); // DRAFT, SUBMITTED
            $table->timestamps();

            // Unique constraint to prevent 1 prodi filling self assessment multiple times for same target
            $table->unique(['unit_id', 'metric_target_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('trx_self_assessments');
    }
};
