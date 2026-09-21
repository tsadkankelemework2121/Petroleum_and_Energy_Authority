<?php

namespace App\Http\Controllers;

use App\Models\Depot;
use App\Models\Dispatch;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class DepotController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $role = strtoupper($user->role);

        if ($role === 'DEPOT_ADMIN') {
            // Depot admin can only see their own depot
            $depots = Depot::where('id', $user->depot_id)->get();
        } elseif ($role === 'OIL_COMPANY_ADMIN' || $role === 'OIL_COMPANY') {
            $companyId = trim($user->company_id ?? '');
            if (!empty($companyId)) {
                $depots = Depot::whereRaw('LOWER(oil_company_id) = ?', [strtolower($companyId)])->get();
            } else {
                $depots = collect();
            }
        } else {
            // EPA can see all, or filter if provided
            $companyId = $request->query('oil_company_id');
            if ($companyId) {
                $depots = Depot::whereRaw('LOWER(oil_company_id) = ?', [strtolower(trim($companyId))])->get();
            } else {
                $depots = Depot::all();
            }
        }

        // Add has_dispatches flag for frontend delete protection
        $depots->each(function ($depot) {
            $depot->has_dispatches = Dispatch::where('destination_depot_id', $depot->id)->exists();
        });
        
        return response()->json($depots);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $role = strtoupper($user->role);
        
        $validated = $request->validate([
            'name' => 'required|string',
            'region' => 'required|string',
            'city' => 'required|string',
            'address' => 'required|string',
            'person1' => 'nullable|string',
            'person2' => 'nullable|string',
            'phone1' => 'nullable|string',
            'phone2' => 'nullable|string',
            'email1' => 'nullable|email',
            'email2' => 'nullable|email',
            'lat' => 'nullable|numeric',
            'lng' => 'nullable|numeric',
            'map_link' => 'nullable|string',
            'oil_company_id' => ($role === 'EPA_ADMIN' || $role === 'SUPER_ADMIN') ? 'required|string' : 'nullable|string',
            'password' => 'nullable|string|min:6',
        ]);

        if ($role === 'OIL_COMPANY' || $role === 'OIL_COMPANY_ADMIN') {
            $validated['oil_company_id'] = $user->company_id;
        } else {
            $validated['oil_company_id'] = $request->input('oil_company_id') ?: $validated['oil_company_id'] ?? null;
        }

        $depot = Depot::create($validated);

        // Auto-create a DEPOT_ADMIN user if email1 and password are provided
        if (!empty($request->input('email1')) && !empty($request->input('password'))) {
            // Check if user with this email already exists
            $existingUser = User::where('email', $request->input('email1'))->first();
            if (!$existingUser) {
                User::create([
                    'name' => $depot->name . ' Admin',
                    'email' => $request->input('email1'),
                    'password' => Hash::make($request->input('password')),
                    'role' => 'DEPOT_ADMIN',
                    'company_id' => $depot->oil_company_id,
                    'depot_id' => $depot->id,
                ]);
            }
        }

        return response()->json($depot, 201);
    }

    public function show(Depot $depot)
    {
        return response()->json($depot);
    }

    public function update(Request $request, Depot $depot)
    {
        $user = $request->user();
        $role = strtoupper($user->role);

        if ($role === 'OIL_COMPANY' || $role === 'OIL_COMPANY_ADMIN') {
            if (strtolower(trim($depot->oil_company_id ?? '')) !== strtolower(trim($user->company_id ?? ''))) {
                return response()->json(['message' => 'Forbidden: This is not your depot'], 403);
            }
        } elseif ($role !== 'EPA_ADMIN' && $role !== 'SUPER_ADMIN') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string',
            'region' => 'sometimes|required|string',
            'city' => 'sometimes|required|string',
            'address' => 'sometimes|required|string',
            'person1' => 'nullable|string',
            'person2' => 'nullable|string',
            'phone1' => 'nullable|string',
            'phone2' => 'nullable|string',
            'email1' => 'nullable|email',
            'email2' => 'nullable|email',
            'lat' => 'nullable|numeric',
            'lng' => 'nullable|numeric',
            'map_link' => 'nullable|string',
            'oil_company_id' => ($role === 'EPA_ADMIN' || $role === 'SUPER_ADMIN') ? 'sometimes|required|string' : 'nullable|string',
            'password' => 'nullable|string|min:6',
        ]);

        if (($role === 'OIL_COMPANY' || $role === 'OIL_COMPANY_ADMIN')) {
            unset($validated['oil_company_id']); // Cannot change company id
        }

        // Handle password update
        $rawPassword = $request->input('password');
        if (!empty($rawPassword)) {
            // Keep password plain text in depots table
            $validated['password'] = $rawPassword;

            // Update or create the linked DEPOT_ADMIN user
            $depotUser = User::where('depot_id', $depot->id)->first();
            if ($depotUser) {
                $depotUser->update(['password' => Hash::make($rawPassword)]);
                // Update email if changed
                if (!empty($validated['email1'])) {
                    $depotUser->update(['email' => $validated['email1']]);
                }
            } elseif (!empty($validated['email1'])) {
                User::create([
                    'name' => $depot->name . ' Admin',
                    'email' => $validated['email1'],
                    'password' => Hash::make($rawPassword),
                    'role' => 'DEPOT_ADMIN',
                    'company_id' => $depot->oil_company_id,
                    'depot_id' => $depot->id,
                ]);
            }
        } else {
            unset($validated['password']); // Don't clear password if not provided
        }

        $depot->update($validated);
        return response()->json($depot);
    }

    public function destroy(Request $request, Depot $depot)
    {
        return response()->json(['message' => 'Forbidden: Depots cannot be deleted.'], 403);
    }
}
