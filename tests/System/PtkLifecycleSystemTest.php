<?php

namespace Tests\System;

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

class PtkLifecycleSystemTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function test_auditor_and_auditee_can_complete_end_to_end_ptk_lifecycle(): void
    {
        [$auditor, $auditee, $evidence] = $this->makeAuditActorsAndEvidence();

        $this->actingAs($auditor, 'api')->postJson('/api/v1/ptk', [
            'metric_id' => $evidence->metric_id,
            'evidence_id' => $evidence->id,
            'assigned_user_id' => $auditee->id,
            'assigned_unit_id' => $auditee->unit_id,
            'finding_summary' => 'Perlu tindakan koreksi dan bukti perbaikan.',
            'target_completion_date' => '2026-12-31',
        ])->assertCreated()->assertJsonPath('data.status', 'OPEN');

        $ptk = TrxPtk::firstOrFail();

        $this->actingAs($auditee, 'api')->patchJson("/api/v1/ptk/{$ptk->id}/target-date/respond", [
            'action' => 'accept',
        ])->assertOk()->assertJsonPath('data.target_date_status', 'ACCEPTED');

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

        $this->assertDatabaseHas('trx_ptks', [
            'id' => $ptk->id,
            'status' => 'CLOSED',
        ]);
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
            'name' => 'Standar Uji Sistem PTK',
            'category' => 'Tambahan',
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
