<?php

namespace App\Modules\Audit\Models;

use App\Models\User;
use App\Modules\Core\Models\Unit;
use App\Modules\Standard\Models\MstStandard;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditSchedule extends Model
{
    use HasFactory;

    protected $fillable = [
        'standard_id',
        'faculty_id',
        'prodi_id',
        'lead_auditor_id',
        'auditor_id',
        'auditee_id',
        'created_by',
        'title',
        'scheduled_start',
        'scheduled_end',
        'location',
        'notes',
        'auditor_status',
        'auditor_response_note',
        'auditor_responded_at',
        'auditee_status',
        'auditee_response_note',
        'auditee_responded_at',
        'overall_status',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_start' => 'datetime',
            'scheduled_end' => 'datetime',
            'auditor_responded_at' => 'datetime',
            'auditee_responded_at' => 'datetime',
        ];
    }

    public function standard(): BelongsTo
    {
        return $this->belongsTo(MstStandard::class, 'standard_id');
    }

    public function faculty(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'faculty_id');
    }

    public function prodi(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'prodi_id');
    }

    public function auditor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'auditor_id');
    }

    public function leadAuditor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'lead_auditor_id');
    }

    public function auditee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'auditee_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
