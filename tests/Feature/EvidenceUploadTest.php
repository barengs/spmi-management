<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Standard\Models\MstMetric;
use App\Modules\Standard\Models\MstStandard;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class EvidenceUploadTest extends TestCase
{
    use RefreshDatabase;

    public function test_file_evidence_can_be_uploaded_to_indicator(): void
    {
        Storage::fake('local');

        $user = User::factory()->create();
        $standard = MstStandard::create([
            'name' => 'Standar Bukti',
            'category' => 'Institusi',
            'periode_tahun' => 2026,
            'is_active' => true,
            'status' => 'DRAFT',
        ]);

        $indicator = MstMetric::create([
            'standard_id' => $standard->id,
            'parent_id' => null,
            'content' => 'Indicator Uji Upload',
            'type' => 'Indicator',
            'order' => 1,
        ]);

        $response = $this->actingAs($user, 'api')->post("/api/v1/metrics/{$indicator->id}/evidences", [
            'source_type' => 'file',
            'title' => 'Bukti Uji',
            'file' => UploadedFile::fake()->create('bukti.pdf', 120, 'application/pdf'),
        ]);

        $response->assertCreated();
        $response->assertJsonPath('status', 'success');
    }
}
