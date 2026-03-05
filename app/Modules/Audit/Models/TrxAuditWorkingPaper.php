<?php

namespace App\Modules\Audit\Models;

use Illuminate\Database\Eloquent\Model;
use App\Modules\Standard\Models\MetricTarget;

class TrxAuditWorkingPaper extends Model
{
    protected $fillable = [
        'audit_schedule_id',
        'metric_target_id',
        'auditor_score',
        'status',
        'auditor_notes',
    ];

    public function schedule()
    {
        return $this->belongsTo(TrxAuditSchedule::class, 'audit_schedule_id');
    }

    public function metricTarget()
    {
        return $this->belongsTo(MetricTarget::class, 'metric_target_id');
    }

    public function findings()
    {
        return $this->hasMany(TrxAuditFinding::class, 'audit_working_paper_id');
    }
}
