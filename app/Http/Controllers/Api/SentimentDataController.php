<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SentimentDataController extends Controller
{
    /**
     * Retrieve all feedback alongside their AI sentiment analysis results.
     */
    public function index()
    {
        // Perform a Left Join to ensure we get all feedback, 
        // even if the AI analysis is still pending or failed.
        $feedbacks = DB::table('feedback')
            ->leftJoin('sentiment_analysis', 'feedback.response_id', '=', 'sentiment_analysis.response_id')
            ->select(
                'feedback.response_id',
                'feedback.control_number',
                'feedback.form_id',
                'feedback.submitted_at',
                'feedback.status',
                'sentiment_analysis.sentiment',
                'sentiment_analysis.confidence_score',
                'sentiment_analysis.analyzed_at'
            )
            ->orderBy('feedback.submitted_at', 'desc')
            ->get();

        // Return a structured JSON response
        return response()->json([
            'success' => true,
            'count'   => $feedbacks->count(),
            'data'    => $feedbacks
        ]);
    }
}