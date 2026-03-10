<?php

namespace App\Modules\Standard\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Collection;

class MstStandard extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'category',
        'periode_tahun',
        'is_active',
        'referensi_regulasi',
        'status',
        'submitted_by',
        'approved_by',
        'reject_reason',
    ];

    public function submitter()
    {
        return $this->belongsTo(\App\Modules\Core\Models\User::class, 'submitted_by');
    }

    public function approver()
    {
        return $this->belongsTo(\App\Modules\Core\Models\User::class, 'approved_by');
    }

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function metrics(): HasMany
    {
        return $this->hasMany(MstMetric::class, 'standard_id');
    }

    public function statementsWithoutIndicators(): Collection
    {
        return $this->metrics()
            ->where('type', 'Statement')
            ->get()
            ->filter(fn (MstMetric $statement) => ! $statement->children()->where('type', 'Indicator')->exists())
            ->values();
    }
}
