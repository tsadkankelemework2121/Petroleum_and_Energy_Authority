<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        User::updateOrCreate(
            ['email' => 'admin@epa.com'],
            [
                'name' => 'EPA Admin',
                'password' => Hash::make('admin123'),
                'role' => 'EPA_ADMIN',
            ]
        );

        User::updateOrCreate(
            ['email' => 'admin@ola.com'],
            [
                'name' => 'OLA Admin',
                'password' => Hash::make('admin123'),
                'plain_password' => 'admin123',
                'role' => 'OIL_COMPANY',
                'company_id' => 'OLA',
            ]
        );

        User::updateOrCreate(
            ['email' => 'driver@pea.com'],
            [
                'name' => 'Demo Driver (Abebe)',
                'password' => Hash::make('admin123'),
                'plain_password' => 'admin123',
                'role' => 'DRIVER',
                'vehicle_plate_number' => '3-A04763',
                'phone_number' => '+251911223344',
                'transporter_name' => 'Total Transporters',
            ]
        );
    }
}
