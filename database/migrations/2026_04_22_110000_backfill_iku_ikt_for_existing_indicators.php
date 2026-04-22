<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $indicators = DB::table('mst_metrics')
            ->select('id', 'iku', 'ikt')
            ->where('type', 'Indicator')
            ->whereNull('deleted_at')
            ->orderBy('id')
            ->get();

        $sequence = 1;

        foreach ($indicators as $indicator) {
            $hasIku = filled($indicator->iku);
            $hasIkt = filled($indicator->ikt);

            if ($hasIku || $hasIkt) {
                $sequence++;
                continue;
            }

            $payload = match ($sequence % 3) {
                1 => ['iku' => (string) $sequence, 'ikt' => null],
                2 => ['iku' => null, 'ikt' => (string) $sequence],
                default => ['iku' => (string) $sequence, 'ikt' => (string) $sequence],
            };

            DB::table('mst_metrics')
                ->where('id', $indicator->id)
                ->update($payload);

            $sequence++;
        }
    }

    public function down(): void
    {
        //
    }
};
