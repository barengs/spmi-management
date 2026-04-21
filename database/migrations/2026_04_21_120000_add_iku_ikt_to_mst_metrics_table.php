<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mst_metrics', function (Blueprint $table) {
            $table->string('iku', 255)->nullable()->after('content');
            $table->string('ikt', 255)->nullable()->after('iku');
        });
    }

    public function down(): void
    {
        Schema::table('mst_metrics', function (Blueprint $table) {
            $table->dropColumn(['iku', 'ikt']);
        });
    }
};
