<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiSentimentService
{
    private static $systemInstruction = "You are an expert NLP sentiment analyst for a Philippine State University.
        Analyze the following student or client feedback (which may contain English, Tagalog, or Taglish).

        ### Classification Guidelines:
        - 'Positive': Explicit praise, satisfaction, commendation, or gratitude.
        - 'Negative': Explicit dissatisfaction, delays, poor service, complaints, or harassment.
        - 'Neutral': Factual inquiries, matter-of-fact statements, routine process descriptions, 'N/A', or balanced observations.
        - 'Mixed': Coexisting, explicit positive and negative sentiments with equal weight.

        ### STRICT GIBBERISH & EMPTY RULE:
        If the text consists of random keystrokes, repeated letters, nonsensical words, or short dismissive phrases like 'no comment', 'none', 'wala', 'n/a', or 'ok lang', you MUST:
        1. Classify the sentiment as 'Neutral'.
        2. Set the key_theme to 'No Comments Provided'.
        3. Set the translated_summary to 'Respondent completed the transaction without providing qualitative comments.'

        ### Confidence Score Guidelines:
        - Return an integer percentage between 50 and 100 representing certainty (e.g., 85).

        ### Output Constraints:
        Return ONLY a valid, raw JSON object with no markdown formatting. Structure:
        {
            \"sentiment_category\": \"Positive\" | \"Negative\" | \"Neutral\" | \"Mixed\",
            \"confidence_score\": 95,
            \"key_theme\": \"Staff Courtesy\" | \"Processing Speed\" | \"Facility Cleanliness\" | \"Process Inquiry\" | \"No Comments Provided\",
            \"translated_summary\": \"A concise 1-sentence English translation and summary of the feedback.\"
        }";

    /**
     * Analyze the sentiment using Gemini first, fallback to Groq if it fails.
     */
    public static function analyze($feedbackText)
    {
        $apiKey = env('GEMINI_API_KEY');
        $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={$apiKey}";
       
        $payload = [
            "system_instruction" => [
                "parts" => [["text" => self::$systemInstruction]]
            ],
            "contents" => [
                ["parts" => [["text" => $feedbackText]]]
            ],
            "generationConfig" => [
                "response_mime_type" => "application/json",
                "temperature" => 0.1 
            ]
        ];

        try {
            $response = Http::timeout(15)->post($endpoint, $payload);

            if ($response->successful()) {
                $aiOutput = $response->json('candidates.0.content.parts.0.text');
                return json_decode($aiOutput, true);
            }

            Log::warning('Gemini API Failed (Code: ' . $response->status() . '). Attempting Groq Fallback...');
            return self::fallbackToGroq($feedbackText);

        } catch (\Exception $e) {
            Log::warning('Gemini Connection Error: ' . $e->getMessage() . '. Attempting Groq Fallback...');
            return self::fallbackToGroq($feedbackText);
        }
    }

    /**
     * Secondary AI API (Groq) to ensure 99.9% uptime.
     */
    private static function fallbackToGroq($feedbackText)
    {
        $groqKey = env('GROQ_API_KEY');
        
        // If no Groq key is configured, go straight to the hardcoded fallback
        if (!$groqKey) {
            Log::error('No Groq API key found. Defaulting to Uncategorized.');
            return self::hardFallback();
        }

        $endpoint = "https://api.groq.com/openai/v1/chat/completions";

        $payload = [
            "model" => "openai/gpt-oss-120b", 
            "temperature" => 0.1,
            "response_format" => ["type" => "json_object"],
            "messages" => [
                [
                    "role" => "system",
                    "content" => self::$systemInstruction
                ],
                [
                    "role" => "user",
                    "content" => $feedbackText
                ]
            ]
        ];

        try {
            $response = Http::withToken($groqKey)->timeout(15)->post($endpoint, $payload);

            if ($response->successful()) {
                $aiOutput = $response->json('choices.0.message.content');
                return json_decode($aiOutput, true);
            }

            Log::error('Groq API Error: ' . $response->body());
            return self::hardFallback();

        } catch (\Exception $e) {
            Log::error('Groq Connection Error: ' . $e->getMessage());
            return self::hardFallback();
        }
    }

    /**
     * Absolute last resort if both Google and Groq fail.
     */
    private static function hardFallback()
    {
        return [
            'sentiment_category' => 'Uncategorized',
            'confidence_score' => 0,
            'key_theme' => 'Analysis Pending',
            'translated_summary' => 'AI analysis temporarily unavailable across all networks.'
        ];
    }
}