<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mst_metrics', function (Blueprint $table) {
            $table->string('pj', 50)->nullable()->after('ikt');
        });
    }

    public function down(): void
    {
        Schema::table('mst_metrics', function (Blueprint $table) {
            $table->dropColumn('pj');
        });
    }
};
