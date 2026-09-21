<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DepotController;
use App\Http\Controllers\DispatchController;
use App\Http\Controllers\ZTrackController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::get('/oil-companies', [AuthController::class, 'getOilCompanies']);
    Route::post('/oil-companies', [AuthController::class, 'createOilCompany']);
    Route::put('/oil-companies/{id}', [AuthController::class, 'updateOilCompany']);

    Route::apiResource('depots', DepotController::class);

    Route::post('/dispatches/{dispatch}/deliver', [DispatchController::class, 'markAsDelivered']);
    // Dispatches: only index, store, show, update (no destroy)
    Route::apiResource('dispatches', DispatchController::class)->except(['destroy']);

    // ZTrack Telemetry Module
    Route::get('/ztrack/vehicles', [ZTrackController::class, 'getVehicles']);
    Route::get('/ztrack/vehicles/status', [ZTrackController::class, 'getVehiclesStatus']);
    Route::get('/ztrack/vehicles/{unitId}/report', [ZTrackController::class, 'getMovementReport']);
});

