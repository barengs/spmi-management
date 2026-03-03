<?php

namespace App\Modules\Core\Models;

use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    protected $table = 'activity_logs';

    // Append-only — no updated_at
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'action',
        'model_type',
        'model_id',
        'url',
        'method',
        'ip_address',
        'user_agent',
        'old_data',
        'new_data',
    ];

    protected $casts = [
        'old_data'   => 'array',
        'new_data'   => 'array',
        'created_at' => 'datetime',
    ];

    public static function record(
        string $action,
        ?string $modelType = null,
        ?int $modelId = null,
        mixed $oldData = null,
        mixed $newData = null,
    ): static {
        return static::create([
            'user_id'    => auth()->id(),
            'action'     => $action,
            'model_type' => $modelType,
            'model_id'   => $modelId,
            'url'        => request()->fullUrl(),
            'method'     => request()->method(),
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'old_data'   => $oldData,
            'new_data'   => $newData,
        ]);
    }
}
