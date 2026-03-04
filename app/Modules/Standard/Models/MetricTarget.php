<?php

namespace App\Modules\Standard\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use App\Modules\Core\Models\RefEducationLevel;

class MetricTarget extends Model
{
    use HasFactory, SoftDeletes, HasUuids;

    protected $table = 'metric_targets';

    protected $fillable = [
        'metric_id',
        'level_id',
        'target_value',
        'measure_unit',
        'data_source',
        'evidence_type',
    ];

    public function metric()
    {
        return $this->belongsTo(MstMetric::class, 'metric_id');
    }

    public function level()
    {
        return $this->belongsTo(RefEducationLevel::class, 'level_id');
    }

    public function evidences()
    {
        return $this->belongsToMany(MstEvidence::class, 'evidence_metric_target', 'metric_target_id', 'evidence_id')
                    ->withTimestamps();
    }
}
