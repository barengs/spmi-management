<?php

namespace App\Modules\Borang\Models;

use App\Models\User;
use App\Modules\Core\Models\Unit;
use App\Modules\Standard\Models\MstMetric;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class BorangItem extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'prodi_id',
        'metric_id',
        'pj',
        'created_by',
    ];

    public function prodi(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'prodi_id');
    }

    public function metric(): BelongsTo
    {
        return $this->belongsTo(MstMetric::class, 'metric_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
