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
        Schema::create('evidence_metric_target', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evidence_id')->constrained('mst_evidences')->cascadeOnDelete();
            $table->foreignId('metric_target_id')->constrained('metric_targets')->cascadeOnDelete();
            $table->timestamps();

            // Cegah duplikat pertautan
            $table->unique(['evidence_id', 'metric_target_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('evidence_metric_target');
    }
};
