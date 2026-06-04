<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mst_standard_indicators', function (Blueprint $table) {
            $table->id();
            $table->foreignId('standard_id')->constrained('mst_standards')->cascadeOnDelete();
            $table->enum('type', ['IKU', 'IKT']);
            $table->string('number');
            $table->text('content')->nullable();
            $table->unsignedInteger('order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['standard_id', 'type', 'number', 'deleted_at'], 'mst_standard_indicators_unique_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mst_standard_indicators');
    }
};
