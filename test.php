<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// simulate API GET
$req = Illuminate\Http\Request::create('/api/v1/users', 'GET', ['role' => 'Auditor']);
$res = app()->make(App\Modules\Core\Controllers\UserController::class)->index($req);

file_put_contents('test_out.txt', json_encode($res->getData()));
