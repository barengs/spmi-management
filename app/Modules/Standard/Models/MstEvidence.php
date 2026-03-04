<?php

namespace App\Modules\Standard\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class MstEvidence extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'mst_evidences';

    protected $fillable = [
        'original_name',
        'file_path',
        'mime_type',
        'size',
        'file_hash',
        'uploaded_by',
    ];

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Core\Models\User::class, 'uploaded_by');
    }

    public function metricTargets(): BelongsToMany
    {
        return $this->belongsToMany(MetricTarget::class, 'evidence_metric_target', 'evidence_id', 'metric_target_id')
                    ->withTimestamps();
    }
}
