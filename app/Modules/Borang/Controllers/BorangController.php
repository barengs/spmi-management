<?php

namespace App\Modules\Borang\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Borang\Models\BorangItem;
use App\Modules\Core\Models\Unit;
use App\Modules\Standard\Models\MstMetric;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BorangController extends Controller
{
    private function denyUnless(Request $request, string $permission, string $message): ?JsonResponse
    {
        if (! $request->user()?->can($permission)) {
            return response()->json([
                'status' => 'error',
                'message' => $message,
            ], 403);
        }

        return null;
    }

    public function index(Request $request, Unit $prodi): JsonResponse
    {
        if ($denied = $this->denyUnless($request, 'standard.update', 'Anda tidak memiliki hak akses untuk melihat borang.')) {
            return $denied;
        }

        abort_if($prodi->level !== 'department', 404);

        $items = BorangItem::with([
            'metric.standard',
            'metric.parent',
            'metric.targets.level',
        ])
            ->where('prodi_id', $prodi->id)
            ->orderBy('id')
            ->get()
            ->map(fn (BorangItem $item) => $this->transformItem($item))
            ->values();

        return response()->json([
            'status' => 'success',
            'data' => $items,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        if ($denied = $this->denyUnless($request, 'standard.update', 'Anda tidak memiliki hak akses untuk menambah borang.')) {
            return $denied;
        }

        $validated = $request->validate([
            'prodi_id' => 'required|exists:ref_units,id',
            'metric_id' => 'required|exists:mst_metrics,id',
            'pj' => 'required|in:Dekan,Kaprodi',
        ], [
            'prodi_id.required' => 'prodi wajib dipilih',
            'prodi_id.exists' => 'prodi tidak valid',
            'metric_id.required' => 'indikator wajib dipilih',
            'metric_id.exists' => 'indikator tidak valid',
            'pj.required' => 'pj wajib dipilih',
            'pj.in' => 'pj tidak valid',
        ]);

        $prodi = Unit::findOrFail($validated['prodi_id']);
        if ($prodi->level !== 'department') {
            return response()->json([
                'status' => 'error',
                'message' => 'Borang hanya dapat ditambahkan ke prodi.',
            ], 422);
        }

        $metric = MstMetric::with(['standard', 'parent', 'targets.level'])->findOrFail($validated['metric_id']);
        if ($metric->type !== 'Indicator') {
            return response()->json([
                'status' => 'error',
                'message' => 'Borang hanya dapat menggunakan indikator.',
            ], 422);
        }

        $existing = BorangItem::where('prodi_id', $prodi->id)
            ->where('metric_id', $metric->id)
            ->first();

        if ($existing) {
            return response()->json([
                'status' => 'error',
                'message' => 'Indikator ini sudah ditambahkan pada borang prodi.',
            ], 422);
        }

        $item = BorangItem::create([
            'prodi_id' => $prodi->id,
            'metric_id' => $metric->id,
            'pj' => $validated['pj'],
            'created_by' => $request->user()?->id,
        ]);

        $item->load(['metric.standard', 'metric.parent', 'metric.targets.level']);

        return response()->json([
            'status' => 'success',
            'message' => 'Borang berhasil ditambahkan ke prodi.',
            'data' => $this->transformItem($item),
        ], 201);
    }

    public function destroy(Request $request, BorangItem $borangItem): JsonResponse
    {
        if ($denied = $this->denyUnless($request, 'standard.update', 'Anda tidak memiliki hak akses untuk menghapus borang.')) {
            return $denied;
        }

        $borangItem->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Borang berhasil dihapus.',
            'data' => null,
        ]);
    }

    private function transformItem(BorangItem $item): array
    {
        $metric = $item->metric;
        $targets = $metric?->targets ?? collect();

        $targetSummary = $targets->isNotEmpty()
            ? $targets
                ->map(function ($target) {
                    $value = collect([$target->target_value, $target->measure_unit])
                        ->filter()
                        ->join(' ');

                    return $value ?: ($target->data_source ?: '-');
                })
                ->join('; ')
            : '-';

        return [
            'id' => $item->id,
            'prodi_id' => $item->prodi_id,
            'metric_id' => $metric?->id,
            'standard_id' => $metric?->standard?->id,
            'standard_name' => $metric?->standard?->name ?: '-',
            'iku' => $metric?->iku ?: '-',
            'ikt' => $metric?->ikt ?: '-',
            'sasaran_mutu' => $metric?->parent?->content ?: '-',
            'indikator' => $metric?->content ?: '-',
            'target_sasaran' => $targetSummary,
            'pj' => $item->pj ?: 'Kaprodi',
        ];
    }
}
