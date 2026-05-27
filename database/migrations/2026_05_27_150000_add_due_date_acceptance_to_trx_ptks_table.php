<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('trx_ptks', function (Blueprint $table) {
            $table->date('target_completion_date')->nullable()->after('finding_summary');
            $table->enum('target_date_status', ['PENDING', 'ACCEPTED', 'REJECTED'])
                ->default('PENDING')
                ->after('target_completion_date');
            $table->text('target_date_response_note')->nullable()->after('target_date_status');
            $table->timestamp('target_date_responded_at')->nullable()->after('target_date_response_note');
            $table->foreignId('target_date_responded_by')->nullable()->after('target_date_responded_at')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('trx_ptks', function (Blueprint $table) {
            $table->dropConstrainedForeignId('target_date_responded_by');
            $table->dropColumn([
                'target_completion_date',
                'target_date_status',
                'target_date_response_note',
                'target_date_responded_at',
            ]);
        });
    }
};
