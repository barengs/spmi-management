<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('borang_items', function (Blueprint $table) {
            $table->enum('implementation_status', ['BELUM', 'SEDANG_BERJALAN', 'SELESAI'])
                ->default('BELUM')
                ->after('target_sasaran');
            $table->foreignId('assigned_unit_id')
                ->nullable()
                ->after('implementation_status')
                ->constrained('ref_units')
                ->nullOnDelete();
            $table->foreignId('assigned_user_id')
                ->nullable()
                ->after('assigned_unit_id')
                ->constrained('users')
                ->nullOnDelete();
            $table->date('planned_start_date')->nullable()->after('assigned_user_id');
            $table->date('planned_end_date')->nullable()->after('planned_start_date');
            $table->date('actual_start_date')->nullable()->after('planned_end_date');
            $table->date('actual_end_date')->nullable()->after('actual_start_date');
            $table->text('implementation_notes')->nullable()->after('actual_end_date');
            $table->timestamp('last_progress_updated_at')->nullable()->after('implementation_notes');
        });

        Schema::table('trx_evidences', function (Blueprint $table) {
            $table->foreignId('borang_item_id')
                ->nullable()
                ->after('metric_id')
                ->constrained('borang_items')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('trx_evidences', function (Blueprint $table) {
            $table->dropConstrainedForeignId('borang_item_id');
        });

        Schema::table('borang_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('assigned_unit_id');
            $table->dropConstrainedForeignId('assigned_user_id');
            $table->dropColumn([
                'implementation_status',
                'planned_start_date',
                'planned_end_date',
                'actual_start_date',
                'actual_end_date',
                'implementation_notes',
                'last_progress_updated_at',
            ]);
        });
    }
};
