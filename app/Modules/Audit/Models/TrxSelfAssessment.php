<?php

namespace App\Modules\Audit\Models;

use Illuminate\Database\Eloquent\Model;

class TrxSelfAssessment extends Model
{
    protected $fillable = [
        'unit_id',
        'metric_target_id',
        'claimed_score',
        'success_analysis',
        'failure_analysis',
        'status',
    ];

    public function unit()
    {
        return $this->belongsTo(\App\Modules\Core\Models\RefUnit::class, 'unit_id');
    }

    public function metricTarget()
    {
        return $this->belongsTo(\App\Modules\Standard\Models\MetricTarget::class, 'metric_target_id');
    }

    public function evidences()
    {
        return $this->belongsToMany(
            \App\Modules\Standard\Models\MstEvidence::class,
            'evidence_self_assessment',
            'self_assessment_id',
            'evidence_id'
        )->withPivot('is_rpl')->withTimestamps();
    }
}
