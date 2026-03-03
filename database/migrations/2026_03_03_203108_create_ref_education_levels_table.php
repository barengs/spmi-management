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
        Schema::create('ref_education_levels', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code')->unique(); // e.g. 'D3', 'D4', 'S1'
            $table->string('name'); // e.g. 'Ahli Madya', 'Sarjana Terapan'
            $table->integer('order')->default(0); // for sorting UI
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ref_education_levels');
    }
};
