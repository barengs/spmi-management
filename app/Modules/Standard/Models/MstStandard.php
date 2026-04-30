<?php

namespace App\Modules\Standard\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Collection;

class MstStandard extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'category',
        'periode_tahun',
        'is_active',
        'referensi_regulasi',
        'source_document_path',
        'source_document_original_name',
        'source_document_stored_name',
        'source_document_mime_type',
        'source_document_size_bytes',
        'imported_from_document_at',
        'status',
        'approval_stage',
        'submitted_by',
        'approved_by',
        'review_submitted_by',
        'review_submitted_at',
        'head_lpmi_approved_by',
        'head_lpmi_approved_at',
        'wr1_approved_by',
        'wr1_approved_at',
        'wr2_approved_by',
        'wr2_approved_at',
        'wr3_approved_by',
        'wr3_approved_at',
        'rector_approved_by',
        'rector_approved_at',
        'reject_reason',
    ];

    public function submitter()
    {
        return $this->belongsTo(\App\Modules\Core\Models\User::class, 'submitted_by');
    }

    public function approver()
    {
        return $this->belongsTo(\App\Modules\Core\Models\User::class, 'approved_by');
    }

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'imported_from_document_at' => 'datetime',
            'review_submitted_at' => 'datetime',
            'head_lpmi_approved_at' => 'datetime',
            'wr1_approved_at' => 'datetime',
            'wr2_approved_at' => 'datetime',
            'wr3_approved_at' => 'datetime',
            'rector_approved_at' => 'datetime',
        ];
    }

    public function metrics(): HasMany
    {
        return $this->hasMany(MstMetric::class, 'standard_id');
    }

    public function structuralNodesWithoutContent(): Collection
    {
        return $this->metrics()
            ->whereIn('type', ['Header', 'Statement'])
            ->get()
            ->filter(function (MstMetric $metric) {
                $hasChildren = $metric->children()->exists();
                $hasOwnContent = filled(trim((string) $metric->content));

                return ! $hasChildren && ! $hasOwnContent;
            })
            ->values();
    }
}
