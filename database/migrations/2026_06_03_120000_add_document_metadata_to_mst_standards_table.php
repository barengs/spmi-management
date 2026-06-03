<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mst_standards', function (Blueprint $table) {
            $table->string('standard_code')->nullable()->after('name');
            $table->unsignedInteger('revision_number')->nullable()->after('standard_code');
            $table->unsignedInteger('page_count')->nullable()->after('revision_number');
        });
    }

    public function down(): void
    {
        Schema::table('mst_standards', function (Blueprint $table) {
            $table->dropColumn(['standard_code', 'revision_number', 'page_count']);
        });
    }
};
