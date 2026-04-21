<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('standard_id')->nullable()->constrained('mst_standards')->nullOnDelete();
            $table->foreignId('faculty_id')->nullable()->constrained('ref_units')->nullOnDelete();
            $table->foreignId('prodi_id')->nullable()->constrained('ref_units')->nullOnDelete();
            $table->foreignId('auditor_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('auditee_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->dateTime('scheduled_start');
            $table->dateTime('scheduled_end');
            $table->string('location')->nullable();
            $table->text('notes')->nullable();
            $table->enum('auditor_status', ['PENDING', 'APPROVED', 'REJECTED'])->default('PENDING');
            $table->text('auditor_response_note')->nullable();
            $table->timestamp('auditor_responded_at')->nullable();
            $table->enum('auditee_status', ['PENDING', 'APPROVED', 'REJECTED'])->default('PENDING');
            $table->text('auditee_response_note')->nullable();
            $table->timestamp('auditee_responded_at')->nullable();
            $table->enum('overall_status', ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'])->default('PENDING_APPROVAL');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_schedules');
    }
};
