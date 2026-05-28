<?php

use App\Modules\Core\Controllers\AuthController;
use App\Modules\Core\Controllers\RolePermissionController;
use App\Modules\Core\Controllers\AppSettingController;
use App\Modules\Core\Controllers\UnitController;
use App\Modules\Core\Controllers\UserController;
use App\Modules\Audit\Controllers\AuditScheduleController;
use App\Modules\Audit\Controllers\AuditReportController;
use App\Modules\Borang\Controllers\BorangController;
use App\Modules\Borang\Controllers\PelaksanaanController;
use App\Modules\Evidence\Controllers\EvidenceController;
use App\Modules\Ptk\Controllers\PtkController;
use App\Modules\Standard\Controllers\StandardImprovementController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — E-SPMI v1
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    // ------------------------------------------------------------------
    // Public routes (no auth required)
    // ------------------------------------------------------------------
    Route::prefix('auth')->group(function () {
        Route::post('/login', [AuthController::class, 'login']);
    });

    // ------------------------------------------------------------------
    // Protected routes (JWT token required)
    // ------------------------------------------------------------------
    Route::middleware('auth:api')->group(function () {

        // Auth
        Route::prefix('auth')->group(function () {
            Route::get('/me',    [AuthController::class, 'me']);
            Route::post('/logout', [AuthController::class, 'logout']);
            Route::post('/refresh', [AuthController::class, 'refresh']);
            Route::put('/profile', [AuthController::class, 'updateProfile']);
            Route::put('/password', [AuthController::class, 'updatePassword']);
            Route::post('/signature', [AuthController::class, 'updateSignature']);
            Route::delete('/signature', [AuthController::class, 'removeSignature']);
            Route::get('/signature/download', [AuthController::class, 'downloadSignature']);
        });

        // Organisasi / Unit
        Route::prefix('units')->group(function () {
            Route::get('/flat',          [UnitController::class, 'flat']);
            Route::get('/',              [UnitController::class, 'index']);
            Route::post('/',             [UnitController::class, 'store']);
            Route::get('/{id}',          [UnitController::class, 'show']);
            Route::put('/{id}',          [UnitController::class, 'update']);
            Route::delete('/{id}',       [UnitController::class, 'destroy']);
        });

        // Master Data Jenjang Pendidikan
        Route::get('/education-levels', [\App\Modules\Core\Controllers\RefEducationLevelController::class, 'index']);

        // Users
        Route::prefix('users')->group(function () {
            Route::get('/',                     [UserController::class, 'index']);
            Route::post('/',                    [UserController::class, 'store']);
            Route::get('/{id}',                 [UserController::class, 'show']);
            Route::put('/{id}',                 [UserController::class, 'update']);
            Route::delete('/{id}',              [UserController::class, 'destroy']);
            Route::post('/{id}/force-reset',    [UserController::class, 'forceReset']);
        });

        // Role & Permission Matrix
        Route::prefix('rbac')->group(function () {
            Route::get('/matrix',               [RolePermissionController::class, 'index']);
            Route::post('/roles',              [RolePermissionController::class, 'store']);
            Route::put('/roles/{role}',         [RolePermissionController::class, 'update']);
            Route::get('/permissions',         [RolePermissionController::class, 'permissionIndex']);
            Route::post('/permissions',        [RolePermissionController::class, 'permissionStore']);
            Route::get('/permissions/{permission}', [RolePermissionController::class, 'permissionShow']);
            Route::put('/permissions/{permission}', [RolePermissionController::class, 'permissionUpdate']);
        });

        Route::prefix('settings')->group(function () {
            Route::get('/cycle-duration', [AppSettingController::class, 'showCycleDuration']);
            Route::put('/cycle-duration', [AppSettingController::class, 'updateCycleDuration']);
        });

        // Dokumen Standar Mutu (MstStandard)
        Route::prefix('standards')->group(function () {
            Route::get('/',                     [\App\Modules\Standard\Controllers\StandardController::class, 'index']);
            Route::post('/',                    [\App\Modules\Standard\Controllers\StandardController::class, 'store']);
            Route::post('/import',             [\App\Modules\Standard\Controllers\StandardController::class, 'import']);
            Route::get('/cycle-import/candidates', [\App\Modules\Standard\Controllers\StandardCloneController::class, 'cycleImportCandidates']);
            Route::post('/cycle-import',       [\App\Modules\Standard\Controllers\StandardCloneController::class, 'cycleImport']);
            Route::get('/{id}',                 [\App\Modules\Standard\Controllers\StandardController::class, 'show']);
            Route::get('/{id}/export',          [\App\Modules\Standard\Controllers\StandardController::class, 'export']);
            Route::get('/{id}/source-document/download', [\App\Modules\Standard\Controllers\StandardController::class, 'downloadSourceDocument']);
            Route::put('/{id}',                 [\App\Modules\Standard\Controllers\StandardController::class, 'update']);
            Route::delete('/{id}',              [\App\Modules\Standard\Controllers\StandardController::class, 'destroy']);
            
            // Sprint 5: Cloning & Publish (Multi-level Authorization)
            Route::post('/{id}/clone',          [\App\Modules\Standard\Controllers\StandardCloneController::class, 'clone']);
            Route::patch('/{id}/submit',        [\App\Modules\Standard\Controllers\StandardController::class, 'submit']);
            Route::patch('/{id}/submit-review', [\App\Modules\Standard\Controllers\StandardController::class, 'submitReview']);
            Route::patch('/{id}/approve',       [\App\Modules\Standard\Controllers\StandardController::class, 'approve']);
            Route::patch('/{id}/reject',        [\App\Modules\Standard\Controllers\StandardController::class, 'reject']);
            
            // Hirarki Metrik/Indikator di dalam suatu standar
            Route::get('/{standard_id}/metrics/tree', [\App\Modules\Standard\Controllers\MetricController::class, 'tree']);
        });

        Route::prefix('improvements')->group(function () {
            Route::get('/', [StandardImprovementController::class, 'index']);
            Route::post('/', [StandardImprovementController::class, 'store']);
            Route::get('/summary', [StandardImprovementController::class, 'summary']);
        });

        // Metrik / Indikator CRUD & Target
        Route::prefix('metrics')->group(function () {
            Route::post('/',                    [\App\Modules\Standard\Controllers\MetricController::class, 'store']);
            Route::put('/{id}',                 [\App\Modules\Standard\Controllers\MetricController::class, 'update']);
            Route::delete('/{id}',              [\App\Modules\Standard\Controllers\MetricController::class, 'destroy']);
            Route::patch('/{id}/review',        [\App\Modules\Standard\Controllers\MetricController::class, 'review']);
            Route::get('/{id}/timeline',        [\App\Modules\Standard\Controllers\MetricController::class, 'timeline']);
            
            // Target Diferensiasi per Jenjang
            Route::get('/{metric_id}/targets',       [\App\Modules\Standard\Controllers\MetricTargetController::class, 'getTargets']);
            Route::post('/{metric_id}/targets/sync', [\App\Modules\Standard\Controllers\MetricTargetController::class, 'syncTargets']);
            Route::get('/{metric_id}/evidences',     [EvidenceController::class, 'index']);
            Route::post('/{metric_id}/evidences',    [EvidenceController::class, 'store']);
        });

        Route::prefix('evidences')->group(function () {
            Route::get('/audit',               [EvidenceController::class, 'auditIndex']);
            Route::get('/{id}/download',       [EvidenceController::class, 'download']);
            Route::delete('/{id}',             [EvidenceController::class, 'destroy']);
            Route::patch('/{id}/review',       [EvidenceController::class, 'review']);
        });

        Route::prefix('audit-schedules')->group(function () {
            Route::get('/',                    [AuditScheduleController::class, 'index']);
            Route::get('/metadata',            [AuditScheduleController::class, 'metadata']);
            Route::post('/',                   [AuditScheduleController::class, 'store']);
            Route::put('/{auditSchedule}',     [AuditScheduleController::class, 'update']);
            Route::delete('/{auditSchedule}',  [AuditScheduleController::class, 'destroy']);
            Route::patch('/{auditSchedule}/respond', [AuditScheduleController::class, 'respond']);
            Route::patch('/{auditSchedule}/end-period', [AuditScheduleController::class, 'endPeriod']);
        });

        Route::prefix('audit-reports')->group(function () {
            Route::get('/',                    [AuditReportController::class, 'index']);
        });

        Route::prefix('borang')->group(function () {
            Route::get('/prodis/{prodi}',      [BorangController::class, 'index']);
            Route::get('/items/{borangItem}',  [BorangController::class, 'show']);
            Route::post('/items/{borangItem}/evidences', [BorangController::class, 'storeEvidence']);
            Route::post('/',                   [BorangController::class, 'store']);
            Route::delete('/{borangItem}',     [BorangController::class, 'destroy']);
        });

        Route::prefix('pelaksanaan')->group(function () {
            Route::get('/prodis', [PelaksanaanController::class, 'prodis']);
            Route::get('/prodis/{prodi}', [PelaksanaanController::class, 'index']);
            Route::get('/items/{borangItem}', [PelaksanaanController::class, 'show']);
            Route::put('/items/{borangItem}', [PelaksanaanController::class, 'update']);
        });

        Route::prefix('ptk')->group(function () {
            Route::get('/',                    [PtkController::class, 'index']);
            Route::post('/',                   [PtkController::class, 'store']);
            Route::patch('/{ptk}/target-date', [PtkController::class, 'updateTargetDate']);
            Route::patch('/{ptk}/target-date/respond', [PtkController::class, 'respondTargetDate']);
            Route::patch('/{ptk}/respond',     [PtkController::class, 'respond']);
            Route::patch('/{ptk}/verify',      [PtkController::class, 'verify']);
            Route::patch('/{ptk}/close',       [PtkController::class, 'close']);
        });

    });

});
