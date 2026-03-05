<?php

namespace App\Modules\Audit\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;
use App\Modules\Core\Models\Unit;

class TrxAuditSchedule extends Model
{
    protected $fillable = [
        'audit_period_id',
        'unit_id',
        'status',
        'scheduled_date',
    ];

    public function period()
    {
        return $this->belongsTo(TrxAuditPeriod::class, 'audit_period_id');
    }

    public function unit()
    {
        return $this->belongsTo(Unit::class, 'unit_id');
    }

    public function auditors()
    {
        return $this->belongsToMany(User::class, 'audit_schedule_auditor', 'audit_schedule_id', 'user_id')
                    ->withPivot('is_lead')
                    ->withTimestamps();
    }

    public function workingPapers()
    {
        return $this->hasMany(TrxAuditWorkingPaper::class, 'audit_schedule_id');
    }
}
