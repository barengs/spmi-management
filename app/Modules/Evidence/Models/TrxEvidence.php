<?php

namespace App\Modules\Evidence\Models;

use App\Models\User;
use App\Modules\Standard\Models\MstMetric;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class TrxEvidence extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'trx_evidences';

    protected $fillable = [
        'metric_id',
        'uploaded_by',
        'source_type',
        'title',
        'notes',
        'link_url',
        'file_path',
        'original_name',
        'stored_name',
        'mime_type',
        'size_bytes',
    ];

    protected function casts(): array
    {
        return [
            'size_bytes' => 'integer',
        ];
    }

    public function metric(): BelongsTo
    {
        return $this->belongsTo(MstMetric::class, 'metric_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
