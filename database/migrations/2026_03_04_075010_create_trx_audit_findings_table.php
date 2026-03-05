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
        Schema::create('trx_audit_findings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('audit_working_paper_id')->constrained('trx_audit_working_papers', 'id', 'fk_awp_finding')->onDelete('cascade');
            $table->text('uraian_temuan');
            $table->text('akar_masalah')->nullable();
            $table->text('rekomendasi')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('trx_audit_findings');
    }
};
