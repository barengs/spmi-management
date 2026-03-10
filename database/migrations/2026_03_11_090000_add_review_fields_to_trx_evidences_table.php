<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('trx_evidences', function (Blueprint $table) {
            $table->enum('review_status', ['PENDING', 'REJECTED', 'ACCEPTED'])->default('PENDING')->after('size_bytes');
            $table->text('review_comment')->nullable()->after('review_status');
            $table->foreignId('reviewed_by')->nullable()->after('review_comment')->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable()->after('reviewed_by');
        });
    }

    public function down(): void
    {
        Schema::table('trx_evidences', function (Blueprint $table) {
            $table->dropForeign(['reviewed_by']);
            $table->dropColumn(['review_status', 'review_comment', 'reviewed_by', 'reviewed_at']);
        });
    }
};
