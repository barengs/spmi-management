<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mst_standards', function (Blueprint $table) {
            $table->json('indicator_entries')->nullable()->after('ikt_count');
        });
    }

    public function down(): void
    {
        Schema::table('mst_standards', function (Blueprint $table) {
            $table->dropColumn('indicator_entries');
        });
    }
};
