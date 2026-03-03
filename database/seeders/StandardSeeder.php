<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Modules\Standard\Models\MstStandard;
use App\Modules\Standard\Models\MstMetric;

class StandardSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $data = [
            [
                'name' => 'Standar Kompetensi Lulusan',
                'category' => 'SN-Dikti',
                'periode_tahun' => date('Y'),
                'is_active' => true,
                'status' => 'TERBIT',
                'referensi_regulasi' => 'Permendikbudristek No 53 Tahun 2023',
                'tree' => [
                    [
                        'content' => '1. Rumusan Kompetensi',
                        'type' => 'Header',
                        'children' => [
                            [
                                'content' => '1.1 Institusi memiliki rumusan Standar Kompetensi Lulusan (SKL) yang mencakup sikap, pengetahuan, dan keterampilan.',
                                'type' => 'Statement',
                                'children' => [
                                    ['content' => 'Tersedianya dokumen SKL yang disahkan Rektor', 'type' => 'Indicator'],
                                    ['content' => 'SKL disosialisasikan kepada seluruh civitas akademika', 'type' => 'Indicator'],
                                ]
                            ]
                        ]
                    ],
                    [
                        'content' => '2. Pencapaian Kompetensi',
                        'type' => 'Header',
                        'children' => [
                            [
                                'content' => '2.1 Lulusan memiliki indeks prestasi kumulatif rata-rata sesuai target.',
                                'type' => 'Statement',
                                'children' => [
                                    ['content' => 'Rata-rata IPK lulusan sarjana minimal 3.25', 'type' => 'Indicator'],
                                ]
                            ]
                        ]
                    ]
                ]
            ],
            [
                'name' => 'Standar Isi Pembelajaran',
                'category' => 'SN-Dikti',
                'periode_tahun' => date('Y'),
                'is_active' => true,
                'referensi_regulasi' => 'Permendikbudristek No 53 Tahun 2023 Pasal 10',
                'tree' => [
                    [
                        'content' => '1. Perencanaan Kurikulum',
                        'type' => 'Header',
                        'children' => [
                            [
                                'content' => '1.1 Kurikulum prodi ditinjau secara berkala setiap 4 tahun.',
                                'type' => 'Statement',
                                'children' => [
                                    ['content' => 'Terdapat dokumen hasil evaluasi kurikulum berkala', 'type' => 'Indicator'],
                                    ['content' => 'Melibatkan mitra industri dalam penyusunan kurikulum', 'type' => 'Indicator'],
                                ]
                            ]
                        ]
                    ]
                ]
            ],
            [
                'name' => 'Standar Publikasi Karya Ilmiah',
                'category' => 'Institusi',
                'periode_tahun' => date('Y'),
                'is_active' => true,
                'referensi_regulasi' => 'Kebijakan Rektorat No 4/2024 (Pelampauan SN-Dikti)',
                'tree' => [
                    [
                        'content' => '1. Publikasi Internasional Terdampak',
                        'type' => 'Header',
                        'children' => [
                            [
                                'content' => '1.1 Dosen tetap harus membuahkan publikasi di jurnal Q1/Q2 setiap tahunnya.',
                                'type' => 'Statement',
                                'children' => [
                                    ['content' => 'Persentase dosen mempublikasikan 1 paper di jurnal Q1/Q2 sebesar 40%', 'type' => 'Indicator'],
                                ]
                            ],
                            [
                                'content' => '1.2 Publikasi melibatkan mahasiswa sbg co-author.',
                                'type' => 'Statement',
                                'children' => [
                                    ['content' => 'Jumlah publikasi bersama mahasiswa minimal 10 judul per fakultas', 'type' => 'Indicator'],
                                ]
                            ]
                        ]
                    ]
                ]
            ]
        ];

        foreach ($data as $stdData) {
            $treeData = $stdData['tree'];
            unset($stdData['tree']);

            $standard = MstStandard::create($stdData);

            $this->buildTree($treeData, $standard->id, null);
        }
    }

    private function buildTree(array $nodes, $standardId, $parentId)
    {
        foreach ($nodes as $index => $nodeData) {
            $children = $nodeData['children'] ?? [];
            unset($nodeData['children']);

            $nodeData['standard_id'] = $standardId;
            $nodeData['parent_id'] = $parentId;
            $nodeData['order'] = $index + 1;

            $metric = MstMetric::create($nodeData);

            if (!empty($children)) {
                $this->buildTree($children, $standardId, $metric->id);
            }
        }
    }
}
