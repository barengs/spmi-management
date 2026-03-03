<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| SPA Catch-All Route
| All non-API routes are handled by React Router on the frontend.
|--------------------------------------------------------------------------
*/
Route::get('/{any}', fn () => view('index'))->where('any', '^(?!api).*$');

