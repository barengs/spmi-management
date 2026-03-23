<?php

namespace App\Modules\Standard\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class MstMetric extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'standard_id',
        'parent_id',
        'content',
        'type',
        'order',
        'review_status',
        'review_action',
        'review_comment',
        'reviewed_by',
        'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'reviewed_at' => 'datetime',
        ];
    }

    public function standard(): BelongsTo
    {
        return $this->belongsTo(MstStandard::class, 'standard_id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(MstMetric::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(MstMetric::class, 'parent_id')->orderBy('order');
    }
    
    // Recursive relationships for full tree fetching
    public function childrenRecursive(): HasMany
    {
        return $this->children()->with('childrenRecursive');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function targets(): HasMany
    {
        return $this->hasMany(MetricTarget::class, 'metric_id');
    }
}
