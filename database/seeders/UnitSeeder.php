<?php

namespace Database\Seeders;

use App\Modules\Core\Models\Unit;
use Illuminate\Database\Seeder;

class UnitSeeder extends Seeder
{
    public function run(): void
    {
        // ------------------------------------------------------------------
        // Level: University
        // ------------------------------------------------------------------
        $university = Unit::firstOrCreate(
            ['code' => 'UNIV-001'],
            [
                'name'      => 'Universitas Contoh',
                'level'     => 'university',
                'parent_id' => null,
                'is_active' => true,
            ]
        );

        // ------------------------------------------------------------------
        // Level: Faculty
        // ------------------------------------------------------------------
        $fti = Unit::firstOrCreate(
            ['code' => 'FTI'],
            ['name' => 'Fakultas Teknologi Informasi', 'level' => 'faculty', 'parent_id' => $university->id, 'is_active' => true]
        );

        $fe = Unit::firstOrCreate(
            ['code' => 'FE'],
            ['name' => 'Fakultas Ekonomi', 'level' => 'faculty', 'parent_id' => $university->id, 'is_active' => true]
        );

        $fk = Unit::firstOrCreate(
            ['code' => 'FK'],
            ['name' => 'Fakultas Keguruan', 'level' => 'faculty', 'parent_id' => $university->id, 'is_active' => true]
        );

        // ------------------------------------------------------------------
        // Level: Department (Prodi)
        // ------------------------------------------------------------------
        Unit::firstOrCreate(
            ['code' => 'TIF-S1'],
            ['name' => 'S1 Teknik Informatika', 'level' => 'department', 'parent_id' => $fti->id, 'is_active' => true]
        );
        Unit::firstOrCreate(
            ['code' => 'SI-S1'],
            ['name' => 'S1 Sistem Informasi', 'level' => 'department', 'parent_id' => $fti->id, 'is_active' => true]
        );
        Unit::firstOrCreate(
            ['code' => 'MNJ-S1'],
            ['name' => 'S1 Manajemen', 'level' => 'department', 'parent_id' => $fe->id, 'is_active' => true]
        );
        Unit::firstOrCreate(
            ['code' => 'AKT-S1'],
            ['name' => 'S1 Akuntansi', 'level' => 'department', 'parent_id' => $fe->id, 'is_active' => true]
        );
        Unit::firstOrCreate(
            ['code' => 'PGSD-S1'],
            ['name' => 'S1 PGSD', 'level' => 'department', 'parent_id' => $fk->id, 'is_active' => true]
        );

        // ------------------------------------------------------------------
        // Level: Bureau (non-academic units for LPM, etc.)
        // ------------------------------------------------------------------
        Unit::firstOrCreate(
            ['code' => 'LPM'],
            ['name' => 'Lembaga Penjaminan Mutu', 'level' => 'bureau', 'parent_id' => $university->id, 'is_active' => true]
        );
    }
}
