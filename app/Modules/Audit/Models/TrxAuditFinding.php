<?php

namespace App\Modules\Audit\Models;

use Illuminate\Database\Eloquent\Model;

class TrxAuditFinding extends Model
{
    protected $fillable = [
        'audit_working_paper_id',
        'uraian_temuan',
        'akar_masalah',
        'rekomendasi',
    ];

    public function workingPaper()
    {
        return $this->belongsTo(TrxAuditWorkingPaper::class, 'audit_working_paper_id');
    }
}
