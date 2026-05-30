<?php

namespace Tests\Unit;

use App\Modules\Standard\Services\StandardDocumentImportService;
use Tests\TestCase;

class StandardDocumentImportServiceTest extends TestCase
{
    public function test_build_tree_from_extracted_text_uses_point_subpoint_and_content_structure(): void
    {
        $service = new StandardDocumentImportService();

        $tree = $service->buildTreeFromExtractedText(implode("\n", [
            '1. Visi dan Misi',
            'A. Visi',
            'Menjadi perguruan tinggi unggul',
            'dan berdaya saing.',
            'B. Misi',
            '1) Menyelenggarakan pendidikan bermutu.',
            '2) Melaksanakan penelitian unggul.',
            '2. Rasionalisasi',
            'A. Rasionalisasi',
            'Paragraf rasionalisasi standar.',
        ]));

        $this->assertCount(2, $tree);
        $this->assertSame('Visi dan Misi', $tree[0]['content']);
        $this->assertCount(2, $tree[0]['children']);
        $this->assertSame('Visi', $tree[0]['children'][0]['content']);
        $this->assertCount(1, $tree[0]['children'][0]['children']);
        $this->assertSame(
            'Menjadi perguruan tinggi unggul dan berdaya saing.',
            $tree[0]['children'][0]['children'][0]['content']
        );
        $this->assertSame('Misi', $tree[0]['children'][1]['content']);
        $this->assertCount(2, $tree[0]['children'][1]['children']);
        $this->assertSame('1) Menyelenggarakan pendidikan bermutu.', $tree[0]['children'][1]['children'][0]['content']);
        $this->assertSame('2) Melaksanakan penelitian unggul.', $tree[0]['children'][1]['children'][1]['content']);
    }

    public function test_build_tree_from_extracted_text_supports_template_style_sections_without_numeric_headers(): void
    {
        $service = new StandardDocumentImportService();

        $tree = $service->buildTreeFromExtractedText(implode("\n", [
            'UNIVERSITAS ISLAM MADURA',
            'Kode',
            ': SPMI-UIM/SMI/I/A',
            'DAFTAR ISI',
            'Visi dan Misi',
            'Visi',
            'Menjadi perguruan tinggi unggul dan berdaya saing di tingkat Asia tahun 2045.',
            'Misi',
            'Menyelenggarakan pendidikan bermutu.',
            'Melaksanakan penelitian unggul.',
            'Rasionalisasi Standar Visi, Misi, Tujuan dan Strategi',
            'Standar VMTS merupakan standar identitas universitas.',
            'Pernyataan Isi Standar Visi, Misi, Tujuan dan Strategi',
            'Rektor menetapkan visi dan misi perguruan tinggi secara berkala.',
            'Rektor mensosialisasikan visi dan misi kepada pemangku kepentingan.',
        ]));

        $this->assertCount(3, $tree);
        $this->assertSame('Visi dan Misi', $tree[0]['content']);
        $this->assertSame('Visi', $tree[0]['children'][0]['content']);
        $this->assertSame(
            'Menjadi perguruan tinggi unggul dan berdaya saing di tingkat Asia tahun 2045.',
            $tree[0]['children'][0]['children'][0]['content']
        );
        $this->assertSame('Misi', $tree[0]['children'][1]['content']);
        $this->assertCount(2, $tree[0]['children'][1]['children']);
        $this->assertSame('Rasionalisasi Standar Visi, Misi, Tujuan dan Strategi', $tree[1]['content']);
        $this->assertSame('Uraian', $tree[1]['children'][0]['content']);
        $this->assertSame('Pernyataan Isi Standar Visi, Misi, Tujuan dan Strategi', $tree[2]['content']);
        $this->assertCount(2, $tree[2]['children'][0]['children']);
    }
}
