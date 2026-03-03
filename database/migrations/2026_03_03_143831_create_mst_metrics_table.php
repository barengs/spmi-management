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
        Schema::create('mst_metrics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('standard_id')->constrained('mst_standards')->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('mst_metrics')->cascadeOnDelete();
            $table->text('content');
            $table->enum('type', ['Header', 'Statement', 'Indicator'])->default('Statement');
            $table->integer('order')->default(0);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mst_metrics');
    }
};
