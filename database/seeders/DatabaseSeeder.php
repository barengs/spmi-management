<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Seed organisasi
        $this->call(UnitSeeder::class);

        // 2. Seed roles & permissions (must run before user gets assigned a role)
        $this->call(RolePermissionSeeder::class);

        // 3. Create default SuperAdmin
        $admin = User::firstOrCreate(
            ['email' => 'admin@espmi.dev'],
            [
                'nidn_npk' => 'SUPER001',
                'name'     => 'Administrator E-SPMI',
                'password' => Hash::make('Password@123'),
                'is_active' => true,
            ]
        );
        $admin->assignRole('SuperAdmin');

        // 4. Create a sample LPM user
        $lpm = User::firstOrCreate(
            ['email' => 'lpm@espmi.dev'],
            [
                'nidn_npk' => 'LPM001',
                'name'     => 'Admin LPM',
                'password' => Hash::make('Password@123'),
                'is_active' => true,
            ]
        );
        $lpm->assignRole('LPM-Admin');

        $this->command->info('Seeding selesai! Login: admin@espmi.dev / Password@123');
    }
}

