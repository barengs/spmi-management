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
        $this->assertSame('1. Visi dan Misi', $tree[0]['content']);
        $this->assertCount(2, $tree[0]['children']);
        $this->assertSame('A. Visi', $tree[0]['children'][0]['content']);
        $this->assertCount(1, $tree[0]['children'][0]['children']);
        $this->assertSame(
            'Menjadi perguruan tinggi unggul dan berdaya saing.',
            $tree[0]['children'][0]['children'][0]['content']
        );
        $this->assertSame('B. Misi', $tree[0]['children'][1]['content']);
        $this->assertCount(2, $tree[0]['children'][1]['children']);
        $this->assertSame('1) Menyelenggarakan pendidikan bermutu.', $tree[0]['children'][1]['children'][0]['content']);
        $this->assertSame('2) Melaksanakan penelitian unggul.', $tree[0]['children'][1]['children'][1]['content']);
    }
}
