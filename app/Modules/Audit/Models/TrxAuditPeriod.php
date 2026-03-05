<?php

namespace App\Modules\Audit\Models;

use Illuminate\Database\Eloquent\Model;

class TrxAuditPeriod extends Model
{
    protected $fillable = [
        'name',
        'start_date',
        'end_date',
        'status',
    ];

    public function schedules()
    {
        return $this->hasMany(TrxAuditSchedule::class, 'audit_period_id');
    }
}
