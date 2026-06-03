<?php

namespace Tests\Integration;

use App\Modules\Standard\Models\MstMetric;
use App\Modules\Standard\Models\MstStandard;
use App\Modules\Standard\Services\StandardDocumentImportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StandardDocumentImportIntegrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_import_service_persists_standard_tree_into_database(): void
    {
        $standard = MstStandard::create([
            'name' => 'Standar Uji Integrasi',
            'category' => 'Tambahan',
            'periode_tahun' => 2026,
            'is_active' => true,
            'status' => 'DRAFT',
        ]);

        $service = app(StandardDocumentImportService::class);

        $summary = $service->import($standard, null, implode("\n", [
            '1. Visi dan Misi',
            'A. Visi',
            'Menjadi perguruan tinggi unggul.',
            'B. Misi',
            '1) Menyelenggarakan pendidikan bermutu.',
            '2) Melaksanakan penelitian yang relevan.',
        ]));

        $this->assertSame(1, $summary['root_count']);
        $this->assertGreaterThanOrEqual(5, $summary['node_count']);
        $this->assertSame(1, MstMetric::where('standard_id', $standard->id)->where('type', 'Header')->count());
        $this->assertSame(2, MstMetric::where('standard_id', $standard->id)->where('type', 'Statement')->count());
        $this->assertSame(3, MstMetric::where('standard_id', $standard->id)->where('type', 'Indicator')->count());
    }
}
