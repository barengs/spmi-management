<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE activity_logs ALTER COLUMN action TYPE VARCHAR(100)");
        DB::statement("COMMENT ON COLUMN activity_logs.action IS 'Event key or request action'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE activity_logs ALTER COLUMN action TYPE VARCHAR(10)");
        DB::statement("COMMENT ON COLUMN activity_logs.action IS 'POST, PUT, DELETE'");
    }
};
