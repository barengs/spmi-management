<?php

namespace App\Modules\Standard\Models;

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
    ];

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
}
