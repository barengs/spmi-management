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
        Schema::create('audit_schedule_auditor', function (Blueprint $table) {
            $table->id();
            $table->foreignId('audit_schedule_id')->constrained('trx_audit_schedules')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade'); // The Auditor
            $table->boolean('is_lead')->default(false);
            $table->timestamps();

            $table->unique(['audit_schedule_id', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_schedule_auditor');
    }
};
