<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // ------------------------------------------------------------------
        // Define permissions grouped by module
        // ------------------------------------------------------------------
        $permissions = [
            // User management
            'user.view', 'user.create', 'user.update', 'user.delete', 'user.manage',

            // Unit management
            'unit.view', 'unit.create', 'unit.update', 'unit.delete',

            // Standard module (Sprint 3-5)
            'standard.view', 'standard.create', 'standard.update', 'standard.delete',
            'standard.publish', 'standard.clone',

            // Evidence module (Sprint 6-9)
            'evidence.view', 'evidence.upload', 'evidence.delete',

            // Audit module (Sprint 10-13)
            'audit.view', 'audit.create', 'audit.plot',
            'audit.score.view', 'audit.score.update',
            'audit.finding.create', 'audit.finding.update',

            // PTK module (Sprint 14-15)
            'ptk.view', 'ptk.create', 'ptk.respond', 'ptk.verify', 'ptk.close',

            // Report module (Sprint 16)
            'report.view', 'report.export',

            // System administration
            'role.manage', 'system.audit_log.view',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        // ------------------------------------------------------------------
        // Define roles and assign permissions
        // ------------------------------------------------------------------

        // SuperAdmin — bypass all checks via Gate::before (no permission needed)
        $superAdmin = Role::firstOrCreate(['name' => 'SuperAdmin', 'guard_name' => 'web']);
        $superAdmin->syncPermissions(Permission::all());

        // LPM-Admin — full control over standards and audit mgmt
        $lpmAdmin = Role::firstOrCreate(['name' => 'LPM-Admin', 'guard_name' => 'web']);
        $lpmAdmin->syncPermissions([
            'user.view', 'unit.view',
            'standard.view', 'standard.create', 'standard.update', 'standard.delete',
            'standard.publish', 'standard.clone',
            'audit.view', 'audit.create', 'audit.plot',
            'audit.finding.create', 'audit.finding.update',
            'ptk.view', 'ptk.create', 'ptk.close',
            'report.view', 'report.export',
            'system.audit_log.view',
        ]);

        // Perumus — author standards manually without access to approval or other modules
        $perumus = Role::firstOrCreate(['name' => 'Perumus', 'guard_name' => 'web']);
        $perumus->syncPermissions([
            'standard.create',
        ]);

        // Auditor — can score and create findings, read-only on others
        $auditor = Role::firstOrCreate(['name' => 'Auditor', 'guard_name' => 'web']);
        $auditor->syncPermissions([
            'standard.view',
            'evidence.view',
            'audit.view', 'audit.score.view', 'audit.score.update',
            'audit.finding.create', 'audit.finding.update',
            'ptk.view', 'ptk.create', 'ptk.verify', 'ptk.close',
            'report.view',
        ]);

        // Lead Auditor — same capabilities as Auditor, different role label only
        $leadAuditor = Role::firstOrCreate(['name' => 'Lead Auditor', 'guard_name' => 'web']);
        $leadAuditor->syncPermissions($auditor->permissions);

        // Auditee (Kaprodi) — upload evidence, respond to PTK
        $auditee = Role::firstOrCreate(['name' => 'Auditee', 'guard_name' => 'web']);
        $auditee->syncPermissions([
            'standard.view',
            'evidence.view', 'evidence.upload', 'evidence.delete',
            'audit.view', 'audit.score.view',
            'ptk.view', 'ptk.respond',
            'report.view',
        ]);

        // Pimpinan — executive review, can finalize approval of standards
        $pimpinan = Role::firstOrCreate(['name' => 'Pimpinan', 'guard_name' => 'web']);
        $pimpinan->syncPermissions([
            'standard.view', 'standard.publish',
            'audit.view', 'audit.score.view',
            'report.view', 'report.export',
        ]);

        $kepalaLpmi = Role::firstOrCreate(['name' => 'Kepala LPMI', 'guard_name' => 'web']);
        $kepalaLpmi->syncPermissions($pimpinan->permissions);

        $wakilRektor1 = Role::firstOrCreate(['name' => 'Wakil Rektor 1', 'guard_name' => 'web']);
        $wakilRektor1->syncPermissions($pimpinan->permissions);

        $wakilRektor2 = Role::firstOrCreate(['name' => 'Wakil Rektor 2', 'guard_name' => 'web']);
        $wakilRektor2->syncPermissions($pimpinan->permissions);

        $wakilRektor3 = Role::firstOrCreate(['name' => 'Wakil Rektor 3', 'guard_name' => 'web']);
        $wakilRektor3->syncPermissions($pimpinan->permissions);

        $rektor = Role::firstOrCreate(['name' => 'Rektor', 'guard_name' => 'web']);
        $rektor->syncPermissions($pimpinan->permissions);

        // Observer — minimal read-only access
        $observer = Role::firstOrCreate(['name' => 'Observer', 'guard_name' => 'web']);
        $observer->syncPermissions([
            'standard.view',
            'audit.view',
            'report.view',
        ]);
    }
}
