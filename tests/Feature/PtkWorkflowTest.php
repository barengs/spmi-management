<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Core\Models\Unit;
use App\Modules\Evidence\Models\TrxEvidence;
use App\Modules\Ptk\Models\TrxPtk;
use App\Modules\Standard\Models\MstMetric;
use App\Modules\Standard\Models\MstStandard;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class PtkWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function test_rejecting_evidence_does_not_create_ptk_automatically(): void
    {
        [$auditor, $auditee, $evidence] = $this->makeAuditActorsAndEvidence();

        $response = $this->actingAs($auditor, 'api')->patchJson("/api/v1/evidences/{$evidence->id}/review", [
            'action' => 'reject',
            'comment' => 'Dokumen belum menunjukkan tindak lanjut yang memadai.',
        ]);

        $response->assertOk();
        $this->assertDatabaseCount('trx_ptks', 0);
    }

    public function test_auditor_can_create_ptk_then_complete_respond_verify_close_lifecycle(): void
    {
        [$auditor, $auditee, $evidence] = $this->makeAuditActorsAndEvidence();

        $createResponse = $this->actingAs($auditor, 'api')->postJson('/api/v1/ptk', [
            'metric_id' => $evidence->metric_id,
            'evidence_id' => $evidence->id,
            'assigned_user_id' => $auditee->id,
            'assigned_unit_id' => $auditee->unit_id,
            'finding_summary' => 'Perlu tindakan koreksi dan bukti perbaikan.',
        ]);

        $createResponse->assertCreated()->assertJsonPath('data.status', 'OPEN');
        $ptk = TrxPtk::firstOrFail();

        $this->actingAs($auditee, 'api')->patchJson("/api/v1/ptk/{$ptk->id}/respond", [
            'response_note' => 'Unit telah memperbaiki proses dan memperbarui dokumen pendukung.',
        ])->assertOk()->assertJsonPath('data.status', 'RESPONDED');

        $this->actingAs($auditor, 'api')->patchJson("/api/v1/ptk/{$ptk->id}/verify", [
            'action' => 'accept',
            'verification_note' => 'Tindak lanjut sudah sesuai dan dapat diterima.',
        ])->assertOk()->assertJsonPath('data.status', 'VERIFIED');

        $this->actingAs($auditor, 'api')->patchJson("/api/v1/ptk/{$ptk->id}/close", [
            'closure_note' => 'PTK ditutup setelah verifikasi final.',
        ])->assertOk()->assertJsonPath('data.status', 'CLOSED');
    }

    public function test_ptk_cannot_be_closed_before_verification(): void
    {
        [$auditor, $auditee, $evidence] = $this->makeAuditActorsAndEvidence();

        $this->actingAs($auditor, 'api')->postJson('/api/v1/ptk', [
            'metric_id' => $evidence->metric_id,
            'assigned_unit_id' => $auditee->unit_id,
            'finding_summary' => 'Perlu tindakan koreksi.',
        ])->assertCreated();

        $ptk = TrxPtk::firstOrFail();

        $this->actingAs($auditee, 'api')->patchJson("/api/v1/ptk/{$ptk->id}/respond", [
            'response_note' => 'Perbaikan sudah dijalankan.',
        ])->assertOk();

        $response = $this->actingAs($auditor, 'api')->patchJson("/api/v1/ptk/{$ptk->id}/close", [
            'closure_note' => 'Mencoba menutup terlalu cepat.',
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('status', 'error');
    }

    public function test_auditor_can_create_ptk_without_evidence_for_missing_document(): void
    {
        [$auditor, $auditee, $evidence] = $this->makeAuditActorsAndEvidence();

        $response = $this->actingAs($auditor, 'api')->postJson('/api/v1/ptk', [
            'metric_id' => $evidence->metric_id,
            'assigned_unit_id' => $auditee->unit_id,
            'finding_summary' => 'Dokumen belum diunggah oleh prodi pada indikator ini.',
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.evidence', null);
        $response->assertJsonPath('data.status', 'OPEN');
    }

    private function makeAuditActorsAndEvidence(): array
    {
        $auditPermission = Permission::firstOrCreate(['name' => 'audit.score.update', 'guard_name' => 'web']);
        $ptkCreate = Permission::firstOrCreate(['name' => 'ptk.create', 'guard_name' => 'web']);
        $ptkRespond = Permission::firstOrCreate(['name' => 'ptk.respond', 'guard_name' => 'web']);
        $ptkView = Permission::firstOrCreate(['name' => 'ptk.view', 'guard_name' => 'web']);
        $ptkVerify = Permission::firstOrCreate(['name' => 'ptk.verify', 'guard_name' => 'web']);
        $ptkClose = Permission::firstOrCreate(['name' => 'ptk.close', 'guard_name' => 'web']);

        $auditorRole = Role::firstOrCreate(['name' => 'Auditor', 'guard_name' => 'web']);
        $auditorRole->givePermissionTo([$auditPermission, $ptkCreate, $ptkView, $ptkVerify, $ptkClose]);

        $auditeeRole = Role::firstOrCreate(['name' => 'Auditee', 'guard_name' => 'web']);
        $auditeeRole->givePermissionTo([$ptkView, $ptkRespond]);

        $prodi = Unit::create([
            'name' => 'Teknik Informatika',
            'code' => 'TI',
            'level' => 'department',
            'is_active' => true,
        ]);

        $auditor = User::factory()->create();
        $auditor->assignRole($auditorRole);

        $auditee = User::factory()->create([
            'unit_id' => $prodi->id,
        ]);
        $auditee->assignRole($auditeeRole);

        $standard = MstStandard::create([
            'name' => 'Standar Audit PTK',
            'category' => 'Institusi',
            'periode_tahun' => 2026,
            'is_active' => true,
            'status' => 'DRAFT',
        ]);

        $metric = MstMetric::create([
            'standard_id' => $standard->id,
            'content' => 'Indikator audit yang dievaluasi',
            'type' => 'Indicator',
            'order' => 1,
        ]);

        $evidence = TrxEvidence::create([
            'metric_id' => $metric->id,
            'uploaded_by' => $auditee->id,
            'source_type' => 'link',
            'title' => 'Bukti pendukung',
            'notes' => 'Catatan awal bukti audit.',
            'link_url' => 'https://example.com/bukti',
        ]);

        return [$auditor, $auditee, $evidence];
    }
}
