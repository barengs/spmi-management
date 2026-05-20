<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement("ALTER TABLE mst_standards DROP CONSTRAINT IF EXISTS mst_standards_category_check");
            DB::statement("ALTER TABLE mst_standards ALTER COLUMN category TYPE VARCHAR(50)");
            DB::table('mst_standards')->where('category', 'SN-Dikti')->update(['category' => 'Pendidikan']);
            DB::table('mst_standards')->where('category', 'Institusi')->update(['category' => 'Tambahan']);
            DB::statement("ALTER TABLE mst_standards ALTER COLUMN category SET DEFAULT 'Tambahan'");
            DB::statement("ALTER TABLE mst_standards ADD CONSTRAINT mst_standards_category_check CHECK (category IN ('Pendidikan', 'Penelitian', 'Pengabdian', 'Tambahan'))");
            return;
        }

        if ($driver === 'mysql') {
            DB::table('mst_standards')->where('category', 'SN-Dikti')->update(['category' => 'Pendidikan']);
            DB::table('mst_standards')->where('category', 'Institusi')->update(['category' => 'Tambahan']);
            DB::statement("ALTER TABLE mst_standards MODIFY category ENUM('Pendidikan','Penelitian','Pengabdian','Tambahan') NOT NULL DEFAULT 'Tambahan'");
        }
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement("ALTER TABLE mst_standards DROP CONSTRAINT IF EXISTS mst_standards_category_check");
            DB::statement("ALTER TABLE mst_standards ALTER COLUMN category TYPE VARCHAR(50)");
            DB::table('mst_standards')->where('category', 'Pendidikan')->update(['category' => 'SN-Dikti']);
            DB::table('mst_standards')->whereIn('category', ['Tambahan', 'Pengabdian', 'Penelitian'])->update(['category' => 'Institusi']);
            DB::statement("ALTER TABLE mst_standards ALTER COLUMN category SET DEFAULT 'Institusi'");
            DB::statement("ALTER TABLE mst_standards ADD CONSTRAINT mst_standards_category_check CHECK (category IN ('SN-Dikti', 'Institusi'))");
            return;
        }

        if ($driver === 'mysql') {
            DB::table('mst_standards')->where('category', 'Pendidikan')->update(['category' => 'SN-Dikti']);
            DB::table('mst_standards')->whereIn('category', ['Tambahan', 'Pengabdian', 'Penelitian'])->update(['category' => 'Institusi']);
            DB::statement("ALTER TABLE mst_standards MODIFY category ENUM('SN-Dikti','Institusi') NOT NULL DEFAULT 'Institusi'");
        }
    }
};
