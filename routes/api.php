<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\SentimentDataController;


Route::middleware(['auth:sanctum'])->get('/user', function (Request $request) {
    return $request->user();
});
// This URL will automatically become: http://localhost:8000/api/feedbacks
Route::get('/feedbacks', [SentimentDataController::class, 'index']);

