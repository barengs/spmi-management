<?php

use App\Modules\Core\Controllers\AuthController;
use App\Modules\Core\Controllers\RolePermissionController;
use App\Modules\Core\Controllers\UnitController;
use App\Modules\Core\Controllers\UserController;
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
            Route::put('/roles/{role}',         [RolePermissionController::class, 'update']);
        });

        // Dokumen Standar Mutu (MstStandard)
        Route::prefix('standards')->group(function () {
            Route::get('/',                     [\App\Modules\Standard\Controllers\StandardController::class, 'index']);
            Route::post('/',                    [\App\Modules\Standard\Controllers\StandardController::class, 'store']);
            Route::get('/{id}',                 [\App\Modules\Standard\Controllers\StandardController::class, 'show']);
            Route::put('/{id}',                 [\App\Modules\Standard\Controllers\StandardController::class, 'update']);
            Route::delete('/{id}',              [\App\Modules\Standard\Controllers\StandardController::class, 'destroy']);
            
            // Sprint 5: Cloning & Publish (Multi-level Authorization)
            Route::post('/{id}/clone',          [\App\Modules\Standard\Controllers\StandardCloneController::class, 'clone']);
            Route::patch('/{id}/submit',        [\App\Modules\Standard\Controllers\StandardController::class, 'submit']);
            Route::patch('/{id}/approve',       [\App\Modules\Standard\Controllers\StandardController::class, 'approve']);
            Route::patch('/{id}/reject',        [\App\Modules\Standard\Controllers\StandardController::class, 'reject']);
            
            // Hirarki Metrik/Indikator di dalam suatu standar
            Route::get('/{standard_id}/metrics/tree', [\App\Modules\Standard\Controllers\MetricController::class, 'tree']);
        });

        // Metrik / Indikator CRUD & Target
        Route::prefix('metrics')->group(function () {
            Route::post('/',                    [\App\Modules\Standard\Controllers\MetricController::class, 'store']);
            Route::put('/{id}',                 [\App\Modules\Standard\Controllers\MetricController::class, 'update']);
            Route::delete('/{id}',              [\App\Modules\Standard\Controllers\MetricController::class, 'destroy']);
            
            // Target Diferensiasi per Jenjang
            Route::get('/{metric_id}/targets',       [\App\Modules\Standard\Controllers\MetricTargetController::class, 'getTargets']);
            Route::post('/{metric_id}/targets/sync', [\App\Modules\Standard\Controllers\MetricTargetController::class, 'syncTargets']);
        });

    });

});
