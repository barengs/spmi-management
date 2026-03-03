<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('action', 10)->comment('POST, PUT, DELETE');
            $table->string('model_type')->nullable()->comment('App\\Models\\User, etc.');
            $table->unsignedBigInteger('model_id')->nullable();
            $table->string('url', 500)->nullable();
            $table->string('method', 10)->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->json('old_data')->nullable();
            $table->json('new_data')->nullable();
            $table->timestamp('created_at')->useCurrent();
            // NOTE: No updated_at — append-only (immutable) for SPBE forensic integrity

            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            $table->index(['model_type', 'model_id']);
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
