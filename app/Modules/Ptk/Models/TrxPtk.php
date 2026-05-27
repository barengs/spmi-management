<?php

namespace App\Modules\Ptk\Models;

use App\Models\User;
use App\Modules\Core\Models\Unit;
use App\Modules\Evidence\Models\TrxEvidence;
use App\Modules\Standard\Models\MstMetric;
use App\Modules\Standard\Models\MstStandard;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class TrxPtk extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'trx_ptks';

    protected $fillable = [
        'evidence_id',
        'metric_id',
        'standard_id',
        'assigned_user_id',
        'assigned_unit_id',
        'created_by',
        'status',
        'finding_summary',
        'target_completion_date',
        'target_date_status',
        'target_date_response_note',
        'target_date_responded_at',
        'target_date_responded_by',
        'response_note',
        'responded_at',
        'responded_by',
        'verification_note',
        'verified_at',
        'verified_by',
        'closure_note',
        'closed_at',
        'closed_by',
    ];

    protected function casts(): array
    {
        return [
            'target_completion_date' => 'date',
            'target_date_responded_at' => 'datetime',
            'responded_at' => 'datetime',
            'verified_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    public function evidence(): BelongsTo
    {
        return $this->belongsTo(TrxEvidence::class, 'evidence_id');
    }

    public function metric(): BelongsTo
    {
        return $this->belongsTo(MstMetric::class, 'metric_id');
    }

    public function standard(): BelongsTo
    {
        return $this->belongsTo(MstStandard::class, 'standard_id');
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    public function assignedUnit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'assigned_unit_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function responder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responded_by');
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function closer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function targetDateResponder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'target_date_responded_by');
    }
}
