<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('mst_standards')
            ->where('status', '!=', 'TERBIT')
            ->update(['is_active' => false]);
    }

    public function down(): void
    {
        // Data-only normalization. Previous active flags cannot be restored safely.
    }
};
