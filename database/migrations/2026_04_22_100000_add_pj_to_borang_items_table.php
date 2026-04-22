<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('borang_items', function (Blueprint $table) {
            $table->string('pj', 20)->default('Kaprodi')->after('metric_id');
        });
    }

    public function down(): void
    {
        Schema::table('borang_items', function (Blueprint $table) {
            $table->dropColumn('pj');
        });
    }
};
