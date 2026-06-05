<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserOnlySeeder extends Seeder
{
    /**
     * Seed application users only.
     *
     * Run with:
     * php artisan db:seed --class=UserOnlySeeder
     */
    public function run(): void
    {
        $this->call(RolePermissionSeeder::class);

        $password = Hash::make('Password@123');

        $users = [
            [
                'email' => 'admin@espmi.dev',
                'nidn_npk' => 'SUPER001',
                'name' => 'Administrator E-SPMI',
                'roles' => ['SuperAdmin'],
            ],
            [
                'email' => 'lpm@espmi.dev',
                'nidn_npk' => 'LPM001',
                'name' => 'Admin LPM',
                'roles' => ['LPM-Admin'],
            ],
            [
                'email' => 'perumus@espmi.dev',
                'nidn_npk' => 'PRM001',
                'name' => 'Perumus Standar',
                'roles' => ['Perumus'],
            ],
            [
                'email' => 'pemeriksa@espmi.dev',
                'nidn_npk' => 'PMR001',
                'name' => 'Pemeriksa Standar',
                'roles' => ['Pemeriksa'],
            ],
            [
                'email' => 'persetujuan@espmi.dev',
                'nidn_npk' => 'PST001',
                'name' => 'Persetujuan Standar',
                'roles' => ['Persetujuan'],
            ],
            [
                'email' => 'pertimbangan@espmi.dev',
                'nidn_npk' => 'PTB001',
                'name' => 'Pertimbangan Standar',
                'roles' => ['Pertimbangan'],
            ],
            [
                'email' => 'pengendalian@espmi.dev',
                'nidn_npk' => 'PGD001',
                'name' => 'Pengendalian Standar',
                'roles' => ['Pengendalian'],
            ],
            [
                'email' => 'kepala.lpmi@espmi.dev',
                'nidn_npk' => 'KLP001',
                'name' => 'Kepala LPMI',
                'roles' => ['Kepala LPMI'],
            ],
            [
                'email' => 'wareg1@espmi.dev',
                'nidn_npk' => 'WR1001',
                'name' => 'Wakil Rektor 1',
                'roles' => ['Wakil Rektor 1'],
            ],
            [
                'email' => 'wareg2@espmi.dev',
                'nidn_npk' => 'WR2001',
                'name' => 'Wakil Rektor 2',
                'roles' => ['Wakil Rektor 2'],
            ],
            [
                'email' => 'wareg3@espmi.dev',
                'nidn_npk' => 'WR3001',
                'name' => 'Wakil Rektor 3',
                'roles' => ['Wakil Rektor 3'],
            ],
            [
                'email' => 'rektor@espmi.dev',
                'nidn_npk' => 'RKT001',
                'name' => 'Rektor',
                'roles' => ['Rektor'],
            ],
            [
                'email' => 'auditor@espmi.dev',
                'nidn_npk' => 'AUD001',
                'name' => 'Auditor',
                'roles' => ['Auditor'],
            ],
            [
                'email' => 'lead.auditor@espmi.dev',
                'nidn_npk' => 'LAUD001',
                'name' => 'Lead Auditor',
                'roles' => ['Lead Auditor'],
            ],
            [
                'email' => 'auditee@espmi.dev',
                'nidn_npk' => 'ADT001',
                'name' => 'Auditee',
                'roles' => ['Auditee'],
            ],
            [
                'email' => 'pimpinan@espmi.dev',
                'nidn_npk' => 'PMP001',
                'name' => 'Pimpinan',
                'roles' => ['Pimpinan'],
            ],
            [
                'email' => 'observer@espmi.dev',
                'nidn_npk' => 'OBS001',
                'name' => 'Observer',
                'roles' => ['Observer'],
            ],
        ];

        foreach ($users as $item) {
            $user = User::withTrashed()->updateOrCreate(
                ['email' => $item['email']],
                [
                    'nidn_npk' => $item['nidn_npk'],
                    'name' => $item['name'],
                    'password' => $password,
                    'is_active' => true,
                ]
            );

            if ($user->trashed()) {
                $user->restore();
            }

            $user->syncRoles($item['roles']);
        }

        $this->command?->info('User-only seeding selesai. Default password: Password@123');
        $this->command?->info('SuperAdmin: admin@espmi.dev');
    }
}
