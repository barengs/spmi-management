<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mst_standards', function (Blueprint $table) {
            $table->unsignedInteger('version_number')->default(1)->after('periode_tahun');
            $table->foreignId('root_standard_id')->nullable()->after('version_number')->constrained('mst_standards')->nullOnDelete();
            $table->foreignId('previous_standard_id')->nullable()->after('root_standard_id')->constrained('mst_standards')->nullOnDelete();
            $table->foreignId('superseded_by_standard_id')->nullable()->after('previous_standard_id')->constrained('mst_standards')->nullOnDelete();
            $table->foreignId('improved_from_ptk_id')->nullable()->after('superseded_by_standard_id')->constrained('trx_ptks')->nullOnDelete();
            $table->text('improvement_justification')->nullable()->after('improved_from_ptk_id');
        });

        Schema::create('standard_improvements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('standard_id')->constrained('mst_standards')->cascadeOnDelete();
            $table->foreignId('finding_ptk_id')->nullable()->constrained('trx_ptks')->nullOnDelete();
            $table->enum('action', ['REVISI', 'PERTAHANKAN', 'HAPUS']);
            $table->foreignId('new_standard_id')->nullable()->constrained('mst_standards')->nullOnDelete();
            $table->text('justification');
            $table->unsignedInteger('cycle_year')->nullable();
            $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('decided_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('standard_improvements');

        Schema::table('mst_standards', function (Blueprint $table) {
            $table->dropConstrainedForeignId('root_standard_id');
            $table->dropConstrainedForeignId('previous_standard_id');
            $table->dropConstrainedForeignId('superseded_by_standard_id');
            $table->dropConstrainedForeignId('improved_from_ptk_id');
            $table->dropColumn([
                'version_number',
                'improvement_justification',
            ]);
        });
    }
};
