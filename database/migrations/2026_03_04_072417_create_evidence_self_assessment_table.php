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
        Schema::create('evidence_self_assessment', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evidence_id')->constrained('mst_evidences')->onDelete('cascade');
            $table->foreignId('self_assessment_id')->constrained('trx_self_assessments')->onDelete('cascade');
            $table->boolean('is_rpl')->default(false);
            $table->timestamps();
            
            $table->unique(['evidence_id', 'self_assessment_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('evidence_self_assessment');
    }
};
