<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class DriverController extends Controller
{
    public function index(Request $request)
    {
        $drivers = User::whereIn('role', ['driver', 'DRIVER'])
            ->select([
                'id',
                'name',
                'email',
                'role',
                'vehicle_plate_number',
                'phone_number',
                'transporter_name',
                'plain_password',
                'created_at',
            ])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($drivers);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:4',
            'vehicle_plate_number' => 'nullable|string|max:255',
            'phone_number' => 'nullable|string|max:255',
            'transporter_name' => 'nullable|string|max:255',
        ]);

        $driver = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'plain_password' => $validated['password'],
            'role' => 'DRIVER',
            'vehicle_plate_number' => $validated['vehicle_plate_number'] ?? null,
            'phone_number' => $validated['phone_number'] ?? null,
            'transporter_name' => $validated['transporter_name'] ?? null,
        ]);

        return response()->json([
            'message' => 'Driver created successfully',
            'driver' => $driver,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $driver = User::whereIn('role', ['driver', 'DRIVER'])->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|unique:users,email,' . $driver->id,
            'password' => 'nullable|string|min:4',
            'vehicle_plate_number' => 'nullable|string|max:255',
            'phone_number' => 'nullable|string|max:255',
            'transporter_name' => 'nullable|string|max:255',
        ]);

        if (isset($validated['name'])) $driver->name = $validated['name'];
        if (isset($validated['email'])) $driver->email = $validated['email'];
        if (!empty($validated['password'])) {
            $driver->password = Hash::make($validated['password']);
            $driver->plain_password = $validated['password'];
        }
        if (array_key_exists('vehicle_plate_number', $validated)) {
            $driver->vehicle_plate_number = $validated['vehicle_plate_number'];
        }
        if (array_key_exists('phone_number', $validated)) {
            $driver->phone_number = $validated['phone_number'];
        }
        if (array_key_exists('transporter_name', $validated)) {
            $driver->transporter_name = $validated['transporter_name'];
        }

        $driver->save();

        return response()->json([
            'message' => 'Driver updated successfully',
            'driver' => $driver,
        ]);
    }

    public function destroy($id)
    {
        $driver = User::whereIn('role', ['driver', 'DRIVER'])->findOrFail($id);
        $driver->delete();

        return response()->json(['message' => 'Driver deleted successfully']);
    }

    public function import(Request $request)
    {
        $request->validate([
            'drivers' => 'required|array|min:1',
            'drivers.*.name' => 'required|string',
            'drivers.*.email' => 'required|email',
            'drivers.*.password' => 'nullable|string',
            'drivers.*.vehicle_plate_number' => 'nullable|string',
            'drivers.*.phone_number' => 'nullable|string',
            'drivers.*.transporter_name' => 'nullable|string',
        ]);

        $imported = [];
        $errors = [];

        foreach ($request->input('drivers') as $index => $row) {
            try {
                $email = trim(strtolower($row['email'] ?? ''));
                if (empty($email)) {
                    continue;
                }

                $rawPassword = !empty($row['password']) ? trim($row['password']) : 'driver123';

                $driver = User::updateOrCreate(
                    ['email' => $email],
                    [
                        'name' => trim($row['name'] ?? 'Driver'),
                        'password' => Hash::make($rawPassword),
                        'plain_password' => $rawPassword,
                        'role' => 'DRIVER',
                        'vehicle_plate_number' => !empty($row['vehicle_plate_number']) ? trim($row['vehicle_plate_number']) : null,
                        'phone_number' => !empty($row['phone_number']) ? trim($row['phone_number']) : null,
                        'transporter_name' => !empty($row['transporter_name']) ? trim($row['transporter_name']) : null,
                    ]
                );

                $imported[] = $driver;
            } catch (\Exception $e) {
                $errors[] = "Row #" . ($index + 1) . ": " . $e->getMessage();
            }
        }

        return response()->json([
            'message' => 'Imported ' . count($imported) . ' drivers successfully',
            'count' => count($imported),
            'errors' => $errors,
        ]);
    }
}
