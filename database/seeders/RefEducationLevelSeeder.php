<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Modules\Core\Models\RefEducationLevel;

class RefEducationLevelSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $levels = [
            ['code' => 'D3', 'name' => 'Ahli Madya (D3)', 'order' => 1],
            ['code' => 'D4', 'name' => 'Sarjana Terapan (D4)', 'order' => 2],
            ['code' => 'S1', 'name' => 'Sarjana (S1)', 'order' => 3],
            ['code' => 'Profesi', 'name' => 'Program Profesi', 'order' => 4],
            ['code' => 'S2', 'name' => 'Magister (S2)', 'order' => 5],
            ['code' => 'Spesialis', 'name' => 'Program Spesialis', 'order' => 6],
            ['code' => 'S3', 'name' => 'Doktor (S3)', 'order' => 7],
            ['code' => 'Institusi', 'name' => 'Institusi / Universitas', 'order' => 8], // Untuk target yang level root/universitas
        ];

        foreach ($levels as $level) {
            RefEducationLevel::updateOrCreate(
                ['code' => $level['code']],
                ['name' => $level['name'], 'order' => $level['order']]
            );
        }
    }
}
