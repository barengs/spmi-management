<?php

namespace App\Modules\Core\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Unit extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'ref_units';

    protected $fillable = [
        'parent_id',
        'name',
        'code',
        'level',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    // ------------------------------------------------------------------
    // Relationships
    // ------------------------------------------------------------------

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Unit::class, 'parent_id');
    }

    /** Recursive descendants — load the entire subtree */
    public function allChildren(): HasMany
    {
        return $this->children()->with('allChildren');
    }

    public function users(): HasMany
    {
        return $this->hasMany(\App\Models\User::class, 'unit_id');
    }

    // ------------------------------------------------------------------
    // Scopes
    // ------------------------------------------------------------------

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeRoots($query)
    {
        return $query->whereNull('parent_id');
    }

    public function scopeByLevel($query, string $level)
    {
        return $query->where('level', $level);
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    /** Build tree from flat collection (used by API) */
    public static function toTree(): \Illuminate\Support\Collection
    {
        $all   = static::with('allChildren')->roots()->active()->get();
        return $all;
    }

    /** Prevent circular parent assignment */
    public function isCircular(int $newParentId): bool
    {
        if ($newParentId === $this->id) {
            return true;
        }

        $parent = static::find($newParentId);
        while ($parent) {
            if ($parent->id === $this->id) {
                return true;
            }
            $parent = $parent->parent;
        }

        return false;
    }
}
