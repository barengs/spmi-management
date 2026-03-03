<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('nidn_npk', 20)->unique()->nullable()->after('id')
                  ->comment('NIDN untuk dosen, NPK untuk tendik');
            $table->unsignedBigInteger('unit_id')->nullable()->after('nidn_npk');
            $table->boolean('is_active')->default(true)->after('remember_token');
            $table->softDeletes();

            $table->foreign('unit_id')
                  ->references('id')
                  ->on('ref_units')
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['unit_id']);
            $table->dropColumn(['nidn_npk', 'unit_id', 'is_active', 'deleted_at']);
        });
    }
};
