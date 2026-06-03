<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mst_metrics', function (Blueprint $table) {
            $table->string('content_format', 30)->default('LONG_TEXT')->after('type');
        });

        DB::table('mst_metrics')
            ->where('type', 'Header')
            ->update(['content_format' => 'SUB_POINT']);

        DB::table('mst_metrics')
            ->where('type', 'Statement')
            ->update(['content_format' => 'INDICATOR']);

        DB::table('mst_metrics')
            ->where('type', 'Indicator')
            ->update(['content_format' => 'LONG_TEXT']);
    }

    public function down(): void
    {
        Schema::table('mst_metrics', function (Blueprint $table) {
            $table->dropColumn('content_format');
        });
    }
};
