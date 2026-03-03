<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ref_units', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('parent_id')->nullable();
            $table->string('name');
            $table->string('code', 20)->unique()->nullable()->comment('Kode PDDikti');
            $table->enum('level', ['university', 'faculty', 'department', 'bureau'])
                  ->default('department');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('parent_id')
                  ->references('id')
                  ->on('ref_units')
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ref_units');
    }
};
