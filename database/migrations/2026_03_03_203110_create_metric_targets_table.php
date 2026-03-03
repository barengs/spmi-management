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
        Schema::create('metric_targets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('metric_id');
            $table->uuid('level_id');
            $table->string('target_value')->nullable();
            $table->enum('measure_unit', ['Persen', 'Jumlah', 'Rupiah', 'Capaian Mutu', 'Waktu/Bulan', 'Teks Dasar', 'Skala'])->default('Jumlah');
            $table->enum('data_source', ['SIAKAD', 'SISTER', 'PDDikti', 'Manual'])->default('Manual');
            $table->enum('evidence_type', ['File PDF', 'Link Dokumen', 'Teks Singkat', 'Angka Kuantitatif', 'Ya/Tidak'])->default('File PDF');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('metric_id')->references('id')->on('mst_metrics')->onDelete('cascade');
            $table->foreign('level_id')->references('id')->on('ref_education_levels')->onDelete('cascade');
            
            // 1 Metric & 1 Jenjang hanya boleh punya 1 setting Target yang aktif
            $table->unique(['metric_id', 'level_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('metric_targets');
    }
};
