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
        Schema::create('mst_standards', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->enum('category', ['SN-Dikti', 'Institusi'])->default('Institusi');
            $table->integer('periode_tahun')->nullable();
            $table->boolean('is_active')->default(true);
            $table->text('referensi_regulasi')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mst_standards');
    }
};
