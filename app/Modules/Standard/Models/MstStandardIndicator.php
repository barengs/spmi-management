<?php

namespace App\Modules\Standard\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class MstStandardIndicator extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'standard_id',
        'type',
        'number',
        'content',
        'order',
    ];

    protected function casts(): array
    {
        return [
            'order' => 'integer',
        ];
    }

    public function standard(): BelongsTo
    {
        return $this->belongsTo(MstStandard::class, 'standard_id');
    }
}
