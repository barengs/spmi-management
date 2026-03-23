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
        Schema::table('mst_metrics', function (Blueprint $table) {
            $table->enum('review_status', ['PENDING', 'ACCEPTED', 'REJECTED'])->default('PENDING')->after('order');
            $table->enum('review_action', ['REMOVE', 'UPDATE'])->nullable()->after('review_status');
            $table->text('review_comment')->nullable()->after('review_action');
            $table->foreignId('reviewed_by')->nullable()->after('review_comment')->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable()->after('reviewed_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('mst_metrics', function (Blueprint $table) {
            $table->dropForeign(['reviewed_by']);
            $table->dropColumn(['review_status', 'review_action', 'review_comment', 'reviewed_by', 'reviewed_at']);
        });
    }
};
