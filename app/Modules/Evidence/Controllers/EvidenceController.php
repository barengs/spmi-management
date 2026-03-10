<?php

namespace App\Modules\Evidence\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Evidence\Models\TrxEvidence;
use App\Modules\Standard\Models\MstMetric;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EvidenceController extends Controller
{
    public function index($metricId): JsonResponse
    {
        $metric = MstMetric::findOrFail($metricId);

        if ($metric->type !== 'Indicator') {
            return response()->json([
                'status' => 'error',
                'message' => 'Repository bukti hanya tersedia untuk node Indicator.',
            ], 422);
        }

        $evidences = TrxEvidence::query()
            ->with('uploader:id,name,email')
            ->where('metric_id', $metricId)
            ->latest()
            ->get()
            ->map(fn (TrxEvidence $evidence) => $this->transformEvidence($evidence));

        return response()->json([
            'status' => 'success',
            'data' => $evidences,
        ]);
    }

    public function store(Request $request, $metricId): JsonResponse
    {
        $metric = MstMetric::with('standard')->findOrFail($metricId);

        if ($metric->type !== 'Indicator') {
            return response()->json([
                'status' => 'error',
                'message' => 'Bukti hanya dapat diunggah ke node Indicator.',
            ], 422);
        }

        if (in_array($metric->standard->status, ['WAITING_APPROVAL', 'TERBIT'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Bukti tidak dapat diubah karena standar sedang diajukan atau sudah terbit.',
            ], 403);
        }

        $validated = $request->validate([
            'source_type' => 'required|in:file,link',
            'title' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'link_url' => 'required_if:source_type,link|nullable|url|max:2048',
            'file' => 'required_if:source_type,file|nullable|file|mimes:pdf,doc,docx,xls,xlsx|max:20480',
        ]);

        $payload = [
            'metric_id' => $metric->id,
            'uploaded_by' => $request->user()->id,
            'source_type' => $validated['source_type'],
            'title' => $validated['title'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'link_url' => null,
            'file_path' => null,
            'original_name' => null,
            'stored_name' => null,
            'mime_type' => null,
            'size_bytes' => null,
        ];

        if ($validated['source_type'] === 'link') {
            $payload['link_url'] = $validated['link_url'];
        }

        if ($validated['source_type'] === 'file') {
            $file = $request->file('file');
            $baseName = Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME)) ?: 'bukti';
            $storedName = sprintf('%s-%s.%s', $baseName, now()->format('YmdHis'), $file->getClientOriginalExtension());
            $directory = sprintf('evidences/metric-%s', $metric->id);
            $path = $file->storeAs($directory, $storedName, 'local');

            $payload['file_path'] = $path;
            $payload['original_name'] = $file->getClientOriginalName();
            $payload['stored_name'] = $storedName;
            $payload['mime_type'] = $file->getMimeType();
            $payload['size_bytes'] = $file->getSize();
            $payload['title'] = $payload['title'] ?: pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
        }

        $evidence = TrxEvidence::create($payload)->load('uploader:id,name,email');

        return response()->json([
            'status' => 'success',
            'message' => 'Bukti berhasil disimpan ke repository.',
            'data' => $this->transformEvidence($evidence),
        ], 201);
    }

    public function destroy($id): JsonResponse
    {
        $evidence = TrxEvidence::with('metric.standard')->findOrFail($id);

        if (in_array($evidence->metric->standard->status, ['WAITING_APPROVAL', 'TERBIT'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Bukti tidak dapat dihapus karena standar sedang diajukan atau sudah terbit.',
            ], 403);
        }

        if ($evidence->file_path) {
            Storage::disk('local')->delete($evidence->file_path);
        }

        $evidence->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Bukti berhasil dihapus.',
            'data' => null,
        ]);
    }

    public function download($id): StreamedResponse
    {
        $evidence = TrxEvidence::findOrFail($id);

        abort_if($evidence->source_type !== 'file' || ! $evidence->file_path, 404);
        abort_unless(Storage::disk('local')->exists($evidence->file_path), 404);

        return Storage::disk('local')->download(
            $evidence->file_path,
            $evidence->original_name ?? $evidence->stored_name
        );
    }

    private function transformEvidence(TrxEvidence $evidence): array
    {
        return [
            'id' => $evidence->id,
            'metric_id' => $evidence->metric_id,
            'source_type' => $evidence->source_type,
            'title' => $evidence->title,
            'notes' => $evidence->notes,
            'link_url' => $evidence->link_url,
            'original_name' => $evidence->original_name,
            'stored_name' => $evidence->stored_name,
            'mime_type' => $evidence->mime_type,
            'size_bytes' => $evidence->size_bytes,
            'is_previewable' => $evidence->source_type === 'link' || str_starts_with($evidence->mime_type ?? '', 'application/pdf'),
            'download_url' => $evidence->source_type === 'file' ? "/api/v1/evidences/{$evidence->id}/download" : null,
            'uploader' => $evidence->uploader ? [
                'id' => $evidence->uploader->id,
                'name' => $evidence->uploader->name,
                'email' => $evidence->uploader->email,
            ] : null,
            'created_at' => $evidence->created_at?->toISOString(),
        ];
    }
}
