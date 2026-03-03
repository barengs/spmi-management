<?php

namespace App\Modules\Core\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Modules\Core\Models\RefEducationLevel;

class RefEducationLevelController extends Controller
{
    /**
     * Get list of active education levels ordered by UI order
     */
    public function index()
    {
        $levels = RefEducationLevel::where('is_active', true)
                                   ->orderBy('order', 'asc')
                                   ->get();

        return response()->json([
            'status' => 'success',
            'data' => $levels
        ]);
    }
}
