<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mst_standards', function (Blueprint $table) {
            $table->unsignedInteger('iku_count')->nullable()->after('page_count');
            $table->unsignedInteger('ikt_count')->nullable()->after('iku_count');
        });
    }

    public function down(): void
    {
        Schema::table('mst_standards', function (Blueprint $table) {
            $table->dropColumn(['iku_count', 'ikt_count']);
        });
    }
};
