<?php

namespace App\Modules\Standard\Models;

use App\Models\User;
use App\Modules\Ptk\Models\TrxPtk;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StandardImprovement extends Model
{
    protected $fillable = [
        'standard_id',
        'finding_ptk_id',
        'action',
        'new_standard_id',
        'justification',
        'cycle_year',
        'decided_by',
        'decided_at',
    ];

    protected function casts(): array
    {
        return [
            'decided_at' => 'datetime',
        ];
    }

    public function standard(): BelongsTo
    {
        return $this->belongsTo(MstStandard::class, 'standard_id');
    }

    public function finding(): BelongsTo
    {
        return $this->belongsTo(TrxPtk::class, 'finding_ptk_id');
    }

    public function newStandard(): BelongsTo
    {
        return $this->belongsTo(MstStandard::class, 'new_standard_id');
    }

    public function decider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by');
    }
}
