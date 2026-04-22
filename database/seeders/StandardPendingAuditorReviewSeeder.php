<?php

namespace Database\Seeders;

use App\Models\User;
use App\Modules\Core\Models\Unit;
use App\Modules\Standard\Models\MstMetric;
use App\Modules\Standard\Models\MstStandard;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class StandardPendingAuditorReviewSeeder extends Seeder
{
    private int $indicatorSequence = 200;

    public function run(): void
    {
        $lpmUnit = Unit::query()->where('code', 'LPM')->first();

        $auditor = User::updateOrCreate(
            ['email' => 'auditor@espmi.dev'],
            [
                'nidn_npk' => 'AUD001',
                'name' => 'Auditor Mutu Internal',
                'password' => Hash::make('Password@123'),
                'unit_id' => $lpmUnit?->id,
                'is_active' => true,
            ]
        );
        $auditor->syncRoles(['Auditor']);

        $pimpinan = User::updateOrCreate(
            ['email' => 'pimpinan@espmi.dev'],
            [
                'nidn_npk' => 'PMP001',
                'name' => 'Pimpinan Institusi',
                'password' => Hash::make('Password@123'),
                'unit_id' => $lpmUnit?->id,
                'is_active' => true,
            ]
        );
        $pimpinan->syncRoles(['Pimpinan']);

        $admin = User::query()->where('email', 'admin@espmi.dev')->first();

        $publishedStandard = MstStandard::withTrashed()->updateOrCreate(
            ['name' => 'Standar Pembelajaran Berbasis Outcome 2025'],
            [
                'category' => 'Institusi',
                'periode_tahun' => (int) date('Y') - 1,
                'is_active' => true,
                'status' => 'TERBIT',
                'referensi_regulasi' => 'Dokumen periode sebelumnya untuk pembanding review standar.',
                'submitted_by' => null,
                'approved_by' => $pimpinan->id,
                'review_submitted_by' => $auditor->id,
                'review_submitted_at' => now()->subMonths(10),
                'reject_reason' => null,
                'deleted_at' => null,
            ]
        );

        $this->syncTree($publishedStandard, [
            [
                'content' => '1. Perencanaan CPL',
                'type' => 'Header',
                'children' => [
                    [
                        'content' => '1.1 Program studi menetapkan CPL yang selaras dengan profil lulusan.',
                        'type' => 'Statement',
                        'children' => [
                            ['content' => 'Dokumen CPL ditetapkan dan terdokumentasi.', 'type' => 'Indicator'],
                            ['content' => 'CPL dievaluasi bersama pemangku kepentingan internal.', 'type' => 'Indicator'],
                        ],
                    ],
                ],
            ],
            [
                'content' => '2. Evaluasi Implementasi',
                'type' => 'Header',
                'children' => [
                    [
                        'content' => '2.1 Evaluasi ketercapaian CPL dilakukan pada setiap akhir tahun akademik.',
                        'type' => 'Statement',
                        'children' => [
                            ['content' => 'Laporan evaluasi CPL tersedia dan tervalidasi.', 'type' => 'Indicator'],
                        ],
                    ],
                ],
            ],
        ], 'ACCEPTED');

        $pendingStandard = MstStandard::withTrashed()->updateOrCreate(
            ['name' => 'Standar Pembelajaran Berbasis Outcome 2026'],
            [
                'category' => 'Institusi',
                'periode_tahun' => (int) date('Y'),
                'is_active' => true,
                'status' => 'WAITING_APPROVAL',
                'referensi_regulasi' => 'Contoh standar yang sudah diajukan admin tetapi belum direview auditor.',
                'submitted_by' => $admin?->id,
                'approved_by' => null,
                'review_submitted_by' => null,
                'review_submitted_at' => null,
                'reject_reason' => null,
                'deleted_at' => null,
            ]
        );

        $this->syncTree($pendingStandard, [
            [
                'content' => '1. Perencanaan CPL',
                'type' => 'Header',
                'children' => [
                    [
                        'content' => '1.1 Program studi menetapkan CPL yang selaras dengan profil lulusan dan kebutuhan mitra industri.',
                        'type' => 'Statement',
                        'children' => [
                            ['content' => 'Dokumen CPL ditetapkan dan terdokumentasi.', 'type' => 'Indicator'],
                            ['content' => 'CPL dievaluasi bersama pemangku kepentingan internal dan mitra eksternal.', 'type' => 'Indicator'],
                        ],
                    ],
                ],
            ],
            [
                'content' => '2. Evaluasi Implementasi',
                'type' => 'Header',
                'children' => [
                    [
                        'content' => '2.1 Evaluasi ketercapaian CPL dilakukan pada setiap akhir semester.',
                        'type' => 'Statement',
                        'children' => [
                            ['content' => 'Laporan evaluasi CPL tersedia dan tervalidasi.', 'type' => 'Indicator'],
                            ['content' => 'Tindak lanjut evaluasi CPL dibahas dalam rapat tinjauan manajemen.', 'type' => 'Indicator'],
                        ],
                    ],
                ],
            ],
        ], 'PENDING');

        $this->command?->info('Seeder standar pending auditor siap: standar 2026 masih WAITING_APPROVAL dan seluruh node belum direview auditor.');
    }

    private function syncTree(MstStandard $standard, array $nodes, string $reviewStatus, ?int $parentId = null): void
    {
        foreach ($nodes as $index => $nodeData) {
            $children = $nodeData['children'] ?? [];
            $indicatorCodes = $nodeData['type'] === 'Indicator'
                ? $this->generateIndicatorCodes()
                : [null, null];

            $metric = MstMetric::withTrashed()->updateOrCreate(
                [
                    'standard_id' => $standard->id,
                    'parent_id' => $parentId,
                    'content' => $nodeData['content'],
                ],
                [
                    'type' => $nodeData['type'],
                    'order' => $index + 1,
                    'review_status' => $reviewStatus,
                    'review_action' => null,
                    'review_comment' => null,
                    'reviewed_by' => null,
                    'reviewed_at' => null,
                    'deleted_at' => null,
                    'iku' => $indicatorCodes[0],
                    'ikt' => $indicatorCodes[1],
                ]
            );

            if ($children !== []) {
                $this->syncTree($standard, $children, $reviewStatus, $metric->id);
            }
        }
    }

    private function generateIndicatorCodes(): array
    {
        $sequence = $this->indicatorSequence++;

        return match ($sequence % 3) {
            1 => [(string) $sequence, null],
            2 => [null, (string) $sequence],
            default => [(string) $sequence, (string) $sequence],
        };
    }
}
