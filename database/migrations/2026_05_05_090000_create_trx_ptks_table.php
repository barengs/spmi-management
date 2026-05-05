<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('trx_ptks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evidence_id')->nullable()->constrained('trx_evidences')->nullOnDelete();
            $table->foreignId('metric_id')->constrained('mst_metrics')->cascadeOnDelete();
            $table->foreignId('standard_id')->constrained('mst_standards')->cascadeOnDelete();
            $table->foreignId('assigned_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('assigned_unit_id')->nullable()->constrained('ref_units')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('status', ['OPEN', 'RESPONDED', 'REVISION_REQUIRED', 'VERIFIED', 'CLOSED'])->default('OPEN');
            $table->text('finding_summary');
            $table->text('response_note')->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->foreignId('responded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('verification_note')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('closure_note')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'assigned_unit_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trx_ptks');
    }
};
