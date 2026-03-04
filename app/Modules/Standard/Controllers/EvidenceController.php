<?php

namespace App\Modules\Standard\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Modules\Standard\Models\MstEvidence;
use App\Modules\Standard\Models\MetricTarget;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class EvidenceController extends Controller
{
    public function index(Request $request)
    {
        $query = MstEvidence::query();

        // Bisa dipisah berdasarkan uploader jika diinginkan
        // $query->where('uploaded_by', auth()->id());

        if ($request->search) {
            $query->where('original_name', 'like', '%' . $request->search . '%');
        }

        $evidences = $query->orderBy('created_at', 'desc')->paginate(15);
        
        return response()->json($evidences);
    }

    public function store(Request $request)
    {
        $request->validate([
            // mimes pdf, doc, docx, xls, xlsx
            'file' => 'required|file|mimes:pdf,doc,docx,xls,xlsx|max:20480', // 20MB
        ]);

        $file = $request->file('file');
        
        // Hashing for SPBE / Integrity
        $hash = hash_file('sha256', $file->path());

        // Check if file already exists based on hash (optional, to avoid duplicate physical uploads)
        // But for simply MVP we allow it and just hash it.

        $originalName = $file->getClientOriginalName();
        $extension = $file->getClientOriginalExtension();
        $fileName = (auth()->user()->unit->code ?? 'UNIT') . '_' . time() . '_' . Str::random(5) . '.' . $extension;
        
        $path = $file->storeAs('evidences', $fileName, 'public');

        $evidence = MstEvidence::create([
            'original_name' => $originalName,
            'file_path' => $path,
            'mime_type' => $file->getClientMimeType(),
            'size' => $file->getSize(),
            'file_hash' => $hash,
            'uploaded_by' => auth()->id(),
        ]);

        return response()->json([
            'message' => 'Berkas berhasil diunggah',
            'data' => $evidence
        ], 201);
    }

    public function link(Request $request)
    {
        $request->validate([
            'evidence_id' => 'required|exists:mst_evidences,id',
            'metric_target_id' => 'required|exists:metric_targets,id'
        ]);

        $target = MetricTarget::findOrFail($request->metric_target_id);
        
        // Cek guard status (kalau WAITING_APPROVAL atau TERBIT tidak boleh link)
        if ($target->metric->standard->status === 'WAITING_APPROVAL' || $target->metric->standard->status === 'TERBIT') {
            return response()->json(['message' => 'Standar telah dikunci, tidak bisa melampirkan bukti.'], 403);
        }

        $target->evidences()->syncWithoutDetaching([$request->evidence_id]);

        return response()->json(['message' => 'Bukti berhasil ditautkan ke Indikator Kinerja.']);
    }

    public function unlink(Request $request)
    {
        $request->validate([
            'evidence_id' => 'required|exists:mst_evidences,id',
            'metric_target_id' => 'required|exists:metric_targets,id'
        ]);

        $target = MetricTarget::findOrFail($request->metric_target_id);

        if ($target->metric->standard->status === 'WAITING_APPROVAL' || $target->metric->standard->status === 'TERBIT') {
            return response()->json(['message' => 'Standar telah dikunci, tidak bisa melepaskan tautan bukti.'], 403);
        }

        $target->evidences()->detach($request->evidence_id);

        return response()->json(['message' => 'Tautan bukti berhasil dilepaskan.']);
    }

    public function destroy($id)
    {
        $evidence = MstEvidence::findOrFail($id);

        // Hanya boleh dihapus jika tidak ada tautan sama sekali
        if ($evidence->metricTargets()->exists()) {
            return response()->json(['message' => 'File tidak bisa dihapus karena masih digunakan sebagai bukti pada Indikator Kinerja.'], 400);
        }

        if (Storage::disk('public')->exists($evidence->file_path)) {
            Storage::disk('public')->delete($evidence->file_path);
        }

        $evidence->forceDelete();

        return response()->json(['message' => 'Berkas bukti berhasil dihapus secara permanen.']);
    }
}
