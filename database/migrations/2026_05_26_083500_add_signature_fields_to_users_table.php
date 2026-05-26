<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('signature_path')->nullable()->after('is_active');
            $table->string('signature_original_name')->nullable()->after('signature_path');
            $table->string('signature_mime_type', 100)->nullable()->after('signature_original_name');
            $table->unsignedBigInteger('signature_size_bytes')->nullable()->after('signature_mime_type');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'signature_path',
                'signature_original_name',
                'signature_mime_type',
                'signature_size_bytes',
            ]);
        });
    }
};
