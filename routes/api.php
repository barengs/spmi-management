<?php

use App\Modules\Core\Controllers\AuthController;
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

        // Users
        Route::prefix('users')->group(function () {
            Route::get('/',                     [UserController::class, 'index']);
            Route::post('/',                    [UserController::class, 'store']);
            Route::get('/{id}',                 [UserController::class, 'show']);
            Route::put('/{id}',                 [UserController::class, 'update']);
            Route::delete('/{id}',              [UserController::class, 'destroy']);
            Route::post('/{id}/force-reset',    [UserController::class, 'forceReset']);
        });

        // Dokumen Standar Mutu (MstStandard)
        Route::prefix('standards')->group(function () {
            Route::get('/',                     [\App\Modules\Standard\Controllers\StandardController::class, 'index']);
            Route::post('/',                    [\App\Modules\Standard\Controllers\StandardController::class, 'store']);
            Route::get('/{id}',                 [\App\Modules\Standard\Controllers\StandardController::class, 'show']);
            Route::put('/{id}',                 [\App\Modules\Standard\Controllers\StandardController::class, 'update']);
            Route::delete('/{id}',              [\App\Modules\Standard\Controllers\StandardController::class, 'destroy']);
            
            // Hirarki Metrik/Indikator di dalam suatu standar
            Route::get('/{standard_id}/metrics/tree', [\App\Modules\Standard\Controllers\MetricController::class, 'tree']);
        });

        // Metrik / Indikator CRUD
        Route::prefix('metrics')->group(function () {
            Route::post('/',                    [\App\Modules\Standard\Controllers\MetricController::class, 'store']);
            Route::put('/{id}',                 [\App\Modules\Standard\Controllers\MetricController::class, 'update']);
            Route::delete('/{id}',              [\App\Modules\Standard\Controllers\MetricController::class, 'destroy']);
        });

    });

});
