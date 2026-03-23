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
        Schema::table('mst_standards', function (Blueprint $table) {
            $table->foreignId('review_submitted_by')->nullable()->after('approved_by')->constrained('users')->nullOnDelete();
            $table->timestamp('review_submitted_at')->nullable()->after('review_submitted_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('mst_standards', function (Blueprint $table) {
            $table->dropForeign(['review_submitted_by']);
            $table->dropColumn(['review_submitted_by', 'review_submitted_at']);
        });
    }
};
