<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mst_standards', function (Blueprint $table) {
            $table->string('source_document_path')->nullable()->after('referensi_regulasi');
            $table->string('source_document_original_name')->nullable()->after('source_document_path');
            $table->string('source_document_stored_name')->nullable()->after('source_document_original_name');
            $table->string('source_document_mime_type')->nullable()->after('source_document_stored_name');
            $table->unsignedBigInteger('source_document_size_bytes')->nullable()->after('source_document_mime_type');
            $table->timestamp('imported_from_document_at')->nullable()->after('source_document_size_bytes');
        });
    }

    public function down(): void
    {
        Schema::table('mst_standards', function (Blueprint $table) {
            $table->dropColumn([
                'source_document_path',
                'source_document_original_name',
                'source_document_stored_name',
                'source_document_mime_type',
                'source_document_size_bytes',
                'imported_from_document_at',
            ]);
        });
    }
};
