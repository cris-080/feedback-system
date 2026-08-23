<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiSentimentService
{
    /**
     * Analyze the sentiment of a feedback string and return structured JSON data.
     */
    public static function analyze($feedbackText)
    {
        $apiKey = env('GEMINI_API_KEY');
        
        // We use the flash model as it is the fastest and highly capable for text analysis
       $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={$apiKey}";
       
        // The prompt engineering instruction that tells Gemini exactly how to act
        $systemInstruction = "You are an expert data analyst for a Philippine University. 
        Analyze the following feedback (which may be in English, Tagalog, or Taglish). 
        You must return ONLY a raw JSON object with no markdown formatting. 
        The JSON must strictly follow this structure:
        {
            \"sentiment_category\": \"Positive\" | \"Negative\" | \"Neutral\" | \"Mixed\",
            \"confidence_score\": integer (0-100),
            \"key_theme\": \"string (e.g., 'Staff Professionalism', 'System Speed', 'Facility Cleanliness')\",
            \"translated_summary\": \"string (A 1-sentence English translation/summary of the core issue)\"
        }";

        $payload = [
            // System instructions set the rigid behavior of the AI
            "system_instruction" => [
                "parts" => [
                    ["text" => $systemInstruction]
                ]
            ],
            // The actual user feedback goes here
            "contents" => [
                [
                    "parts" => [
                        ["text" => $feedbackText]
                    ]
                ]
            ],
            // Force the API to output strict JSON rather than conversational text
            "generationConfig" => [
                "response_mime_type" => "application/json",
                "temperature" => 0.1 // Low temperature = highly analytical, less creative responses
            ]
        ];

        try {
            $response = Http::post($endpoint, $payload);

            if ($response->successful()) {
                // Extract the AI's response text from the nested JSON structure
                $aiOutput = $response->json('candidates.0.content.parts.0.text');
                
                // Decode the AI's JSON string into a usable PHP array
                return json_decode($aiOutput, true);
            }

            Log::error('Gemini API Error: ' . $response->body());
            return self::fallbackResponse();

        } catch (\Exception $e) {
            Log::error('Gemini Connection Error: ' . $e->getMessage());
            return self::fallbackResponse();
        }
    }

    /**
     * If the API hits a limit or fails, return a safe fallback so the app doesn't crash.
     */
    private static function fallbackResponse()
    {
        return [
            'sentiment_category' => 'Uncategorized',
            'confidence_score' => 0,
            'key_theme' => 'Analysis Pending',
            'translated_summary' => 'AI analysis temporarily unavailable.'
        ];
    }
}