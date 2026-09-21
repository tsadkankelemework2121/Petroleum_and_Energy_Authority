<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\ZTrack\ZTrackService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Clear ZTrack cached SID on login to force fresh session ID
        try {
            app(ZTrackService::class)->clearCachedSid();
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning('Failed to clear cached ZTrack SID on login: ' . $e->getMessage());
        }

        // Create a new token (keep existing sessions alive for multi-device support)
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'company_id' => $user->company_id,
                'depot_id' => $user->depot_id,
                'vehicle_plate_number' => $user->vehicle_plate_number,
                'phone_number' => $user->phone_number,
                'transporter_name' => $user->transporter_name,
            ],
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'company_id' => $user->company_id,
            'depot_id' => $user->depot_id,
            'vehicle_plate_number' => $user->vehicle_plate_number,
            'phone_number' => $user->phone_number,
            'transporter_name' => $user->transporter_name,
        ]);
    }

    public function logout(Request $request)
    {
        // Revoke only the current token (not all devices)
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function getOilCompanies(Request $request)
    {
        $companies = User::whereIn('role', ['oil_company', 'OIL_COMPANY', 'OIL_COMPANY_ADMIN'])
            ->select('id', 'name', 'email', 'company_id', 'plain_password', 'created_at')
            ->get();

        return response()->json($companies);
    }

    public function createOilCompany(Request $request)
    {
        $request->validate([
            'company_id' => 'required|string|max:255',
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'plain_password' => $request->password,
            'role' => 'OIL_COMPANY',
            'company_id' => $request->company_id,
        ]);

        return response()->json([
            'message' => 'Oil company credentials created successfully.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'company_id' => $user->company_id,
                'plain_password' => $user->plain_password,
            ]
        ], 201);
    }

    public function updateOilCompany(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'password' => 'nullable|string|min:6',
            'company_id' => 'sometimes|string|max:255',
        ]);

        if (!empty($validated['name'])) $user->name = $validated['name'];
        if (!empty($validated['email'])) $user->email = $validated['email'];
        if (!empty($validated['company_id'])) $user->company_id = $validated['company_id'];
        if (!empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
            $user->plain_password = $validated['password'];
        }
        $user->save();

        return response()->json([
            'message' => 'Oil company credentials updated successfully.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'company_id' => $user->company_id,
                'plain_password' => $user->plain_password,
            ]
        ]);
    }
}
