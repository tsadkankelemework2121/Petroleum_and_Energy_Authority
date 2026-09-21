<?php

namespace App\Http\Controllers;

use App\Models\Dispatch;
use App\Models\DeliveryConfirmation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class DispatchController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }
        $role = strtoupper($user->role ?? '');

        if ($role === 'DEPOT_ADMIN') {
            $dispatches = Dispatch::where('destination_depot_id', $user->depot_id)
                ->with(['depot', 'confirmation.confirmedByUser'])
                ->get();
        } elseif ($role === 'DRIVER') {
            // Driver sees only dispatches for their assigned vehicle
            $plate = trim($user->vehicle_plate_number ?? '');
            if (!empty($plate)) {
                $dispatches = Dispatch::whereRaw('LOWER(vehicle_id) = ?', [strtolower($plate)])
                    ->with(['depot', 'confirmation.confirmedByUser'])
                    ->get();
            } else {
                $dispatches = collect();
            }
        } elseif ($role === 'OIL_COMPANY_ADMIN' || $role === 'OIL_COMPANY') {
            $dispatches = Dispatch::where('oil_company_id', $user->company_id)
                ->with(['depot', 'confirmation.confirmedByUser'])
                ->get();
        } else {
            $companyId = $request->query('oil_company_id');
            if ($companyId) {
                $dispatches = Dispatch::where('oil_company_id', $companyId)
                    ->with(['depot', 'confirmation.confirmedByUser'])
                    ->get();
            } else {
                $dispatches = Dispatch::with(['depot', 'confirmation.confirmedByUser'])->get();
            }
        }
        
        return response()->json($dispatches);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }
        $role = strtoupper($user->role ?? '');
        if ($role !== 'EPA_ADMIN' && $role !== 'SUPER_ADMIN' && $role !== 'OIL_COMPANY_ADMIN' && $role !== 'OIL_COMPANY') {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        
        if (($role === 'OIL_COMPANY_ADMIN' || $role === 'OIL_COMPANY') && $request->input('oil_company_id') !== $user->company_id) {
            return response()->json(['message' => 'Forbidden: Cannot create dispatch for another company'], 403);
        }

        $validated = $request->validate([
            'oil_company_id' => 'required|string',
            'transporter_id' => 'nullable|string',
            'vehicle_id' => 'required|string',
            'dispatch_datetime' => 'required|date',
            'dispatch_location' => 'required|string',
            'destination_depot_id' => 'required|exists:depots,id',
            'eta_datetime' => 'required|date',
            'drop_off_datetime' => 'nullable|date',
            'fuel_type' => 'required|string',
            'dispatched_liters' => 'required|numeric',
        ]);

       
        $year = date('Y');
        $lastDispatch = Dispatch::where('pea_dispatch_no', 'like', "PEA-$year-%")
            ->orderBy('pea_dispatch_no', 'desc')
            ->first();

        $nextNumber = 1;
        if ($lastDispatch) {
            $parts = explode('-', $lastDispatch->pea_dispatch_no);
            $lastNumber = (int) end($parts);
            $nextNumber = $lastNumber + 1;
        }

        $validated['pea_dispatch_no'] = 'PEA-' . $year . '-' . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);

        $dispatch = Dispatch::create($validated);
        return response()->json($dispatch->load(['depot', 'confirmation']), 201);
    }

    public function markAsDelivered(Request $request, Dispatch $dispatch)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated - no user found'], 401);
        }

        $role = strtoupper($user->role ?? '');

        Log::info('markAsDelivered attempt', [
            'user_id' => $user->id,
            'user_role' => $user->role,
            'role_upper' => $role,
            'dispatch_id' => $dispatch->id,
            'dispatch_pea_no' => $dispatch->pea_dispatch_no,
            'dispatch_depot_id' => $dispatch->destination_depot_id,
            'user_depot_id' => $user->depot_id,
        ]);

 
        if ($role === 'DEPOT_ADMIN') {
            if ((int)$dispatch->destination_depot_id !== (int)$user->depot_id) {
                return response()->json([
                    'message' => 'Forbidden: This dispatch is not for your depot',
                    'debug' => [
                        'dispatch_depot' => $dispatch->destination_depot_id,
                        'user_depot' => $user->depot_id,
                    ]
                ], 403);
            }
        } elseif ($role === 'DRIVER') {
            // Driver can only confirm dispatches for their assigned vehicle
            $plate = trim($user->vehicle_plate_number ?? '');
            $dispatchVehicle = trim($dispatch->vehicle_id ?? '');
            if (empty($plate) || strtolower($plate) !== strtolower($dispatchVehicle)) {
                return response()->json([
                    'message' => 'Forbidden: This dispatch is not for your vehicle',
                    'debug' => [
                        'driver_plate' => $plate,
                        'dispatch_vehicle' => $dispatchVehicle,
                    ]
                ], 403);
            }
        } elseif ($role === 'OIL_COMPANY' || $role === 'OIL_COMPANY_ADMIN') {
            if ($dispatch->oil_company_id !== $user->company_id) {
                return response()->json(['message' => 'Forbidden: This dispatch belongs to another company'], 403);
            }
        } elseif ($role !== 'EPA_ADMIN' && $role !== 'SUPER_ADMIN') {
            return response()->json([
                'message' => 'Forbidden: Your role does not have permission',
                'debug' => ['role' => $user->role, 'role_upper' => $role]
            ], 403);
        }

        // Validate image upload and location data
        $request->validate([
            'image' => 'required|image|max:10240', // max 10MB
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'vehicle_status' => 'nullable|string',
        ]);

        // Store the image
        $imagePath = $request->file('image')->store('confirmations', 'public');

        // Create delivery confirmation record
        $confirmation = DeliveryConfirmation::create([
            'dispatch_id' => $dispatch->id,
            'depot_id' => $role === 'DEPOT_ADMIN' ? $user->depot_id : $dispatch->destination_depot_id,
            'confirmed_by' => $user->id,
            'image_path' => $imagePath,
            'latitude' => $request->input('latitude'),
            'longitude' => $request->input('longitude'),
            'vehicle_status' => $request->input('vehicle_status'),
            'confirmed_at' => now(),
        ]);

        // Update dispatch status
        $dispatch->update([
            'status' => 'Delivered',
            'drop_off_datetime' => now(),
        ]);

        return response()->json($dispatch->load(['depot', 'confirmation.confirmedByUser']));
    }

    public function show(Dispatch $dispatch)
    {
        return response()->json($dispatch->load(['depot', 'confirmation.confirmedByUser']));
    }

    public function update(Request $request, Dispatch $dispatch)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }
        $role = strtoupper($user->role ?? '');
        if ($role !== 'EPA_ADMIN' && $role !== 'SUPER_ADMIN' && $role !== 'OIL_COMPANY_ADMIN' && $role !== 'OIL_COMPANY') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if (($role === 'OIL_COMPANY_ADMIN' || $role === 'OIL_COMPANY') && $request->input('oil_company_id') !== $user->company_id) {
            return response()->json(['message' => 'Forbidden: Cannot update dispatch for another company'], 403);
        }

        if (($role === 'OIL_COMPANY_ADMIN' || $role === 'OIL_COMPANY') && $dispatch->oil_company_id !== $user->company_id) {
            return response()->json(['message' => 'Forbidden: This dispatch belongs to another company'], 403);
        }

        $validated = $request->validate([
            'oil_company_id' => 'required|string',
            'transporter_id' => 'nullable|string',
            'vehicle_id' => 'required|string',
            'dispatch_datetime' => 'required|date',
            'dispatch_location' => 'required|string',
            'destination_depot_id' => 'required|exists:depots,id',
            'eta_datetime' => 'required|date',
            'drop_off_datetime' => 'nullable|date',
            'fuel_type' => 'required|string',
            'dispatched_liters' => 'required|numeric',
            'status' => 'nullable|string',
        ]);

        $dispatch->update($validated);
        return response()->json($dispatch->load(['depot', 'confirmation']));
    }

    // No destroy method - dispatches cannot be deleted
}
