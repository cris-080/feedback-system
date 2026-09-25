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
     * Analyze sentiment using Gemini first,
     * then Groq,
     * then OpenRouter.
     */
    public static function analyze($feedbackText)
    {
        $apiKey = trim(env('GEMINI_API_KEY'));

        if (!$apiKey) {
            Log::warning('No Gemini API key found. Attempting Groq fallback...');
            return self::fallbackToGroq($feedbackText);
        }

        $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={$apiKey}";

        $payload = [
            "systemInstruction" => [
                "parts" => [
                    ["text" => self::$systemInstruction]
                ]
            ],
            "contents" => [
                [
                    "parts" => [
                        ["text" => $feedbackText]
                    ]
                ]
            ],
            "generationConfig" => [
                "responseMimeType" => "application/json",
                "temperature" => 0.1
            ]
        ];

        try {
            $response = Http::connectTimeout(5)
                ->timeout(15)
                ->retry(2, 1000)
                ->post($endpoint, $payload);

            if ($response->successful()) {

                $aiOutput = $response->json('candidates.0.content.parts.0.text');

                $result = json_decode($aiOutput, true);

                if (self::isValidResult($result)) {
                    return $result;
                }

                Log::warning(
                    'Gemini returned invalid sentiment JSON. Attempting Groq fallback...'
                );

            } else {

                Log::warning(
                    'Gemini API Failed (Code: ' . $response->status() .
                    '). Details: ' . $response->body() .
                    ' -- Attempting Groq Fallback...'
                );
            }

            return self::fallbackToGroq($feedbackText);

        } catch (\Exception $e) {

            Log::warning(
                'Gemini Connection Error: ' . $e->getMessage() .
                '. Attempting Groq Fallback...'
            );

            return self::fallbackToGroq($feedbackText);
        }
    }

    /**
     * Secondary AI API: Groq.
     */
    private static function fallbackToGroq($feedbackText)
    {
        $groqKey = trim(env('GROQ_API_KEY'));

        if (!$groqKey) {
            Log::error(
                'No Groq API key found. Attempting OpenRouter fallback...'
            );

            return self::fallbackToOpenRouter($feedbackText);
        }

        $endpoint = "https://api.groq.com/openai/v1/chat/completions";

        $payload = [
            "model" => "openai/gpt-oss-120b",
            "temperature" => 0.1,
            "response_format" => [
                "type" => "json_object"
            ],
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

            $response = Http::withToken($groqKey)
                ->connectTimeout(5)
                ->timeout(15)
                ->post($endpoint, $payload);

            if ($response->successful()) {

                $aiOutput = $response->json('choices.0.message.content');

                $result = json_decode($aiOutput, true);

                if (self::isValidResult($result)) {
                    return $result;
                }

                Log::warning(
                    'Groq returned invalid sentiment JSON. Attempting OpenRouter fallback...'
                );

            } else {

                Log::error(
                    'Groq API Error (Code: ' . $response->status() .
                    '): ' . $response->body() .
                    ' -- Attempting OpenRouter fallback...'
                );
            }

        } catch (\Exception $e) {

            Log::error(
                'Groq Connection Error: ' . $e->getMessage() .
                '. Attempting OpenRouter fallback...'
            );
        }

        return self::fallbackToOpenRouter($feedbackText);
    }

    /**
     * Third AI API: OpenRouter using Qwen3 8B Free.
     */
    private static function fallbackToOpenRouter($feedbackText)
    {
        $openRouterKey = trim(env('OPENROUTER_API_KEY'));

        if (!$openRouterKey) {
            Log::error(
                'No OpenRouter API key found. Using hard fallback.'
            );

            return self::hardFallback();
        }

        $endpoint = "https://openrouter.ai/api/v1/chat/completions";

        $systemPrompt = self::$systemInstruction . "

        ### IMPORTANT OPENROUTER RULES:
        Return ONLY valid JSON.
        Do not use markdown.
        Do not include explanations outside the JSON object.
        Keep exactly these four fields:
        sentiment_category
        confidence_score
        key_theme
        translated_summary

        sentiment_category MUST be exactly one of:
        Positive, Negative, Neutral, Mixed

        confidence_score MUST be an integer between 50 and 100.

        key_theme MUST be exactly one of:
        Staff Courtesy
        Processing Speed
        Facility Cleanliness
        Process Inquiry
        No Comments Provided
        ";

        $payload = [
            "model" => "qwen/qwen3-8b:free",
            "temperature" => 0.1,
            "max_tokens" => 200,

            "response_format" => [
                "type" => "json_object"
            ],

            "messages" => [
                [
                    "role" => "system",
                    "content" => $systemPrompt
                ],
                [
                    "role" => "user",
                    "content" => $feedbackText
                ]
            ]
        ];

        try {

            $response = Http::withToken($openRouterKey)
                ->connectTimeout(5)
                ->timeout(15)
                ->post($endpoint, $payload);

            if (!$response->successful()) {

                Log::error(
                    'OpenRouter API Error (Code: ' . $response->status() .
                    '): ' . $response->body()
                );

                return self::hardFallback();
            }

            $aiOutput = $response->json('choices.0.message.content');

            if (!is_string($aiOutput) || trim($aiOutput) === '') {

                Log::error(
                    'OpenRouter returned an empty response.'
                );

                return self::hardFallback();
            }

            $result = json_decode($aiOutput, true);

            if (!self::isValidResult($result)) {

                Log::error(
                    'OpenRouter returned invalid sentiment JSON: ' . $aiOutput
                );

                return self::hardFallback();
            }

            Log::info(
                'OpenRouter fallback succeeded using qwen/qwen3-8b:free.'
            );

            return $result;

        } catch (\Exception $e) {

            Log::error(
                'OpenRouter Connection Error: ' . $e->getMessage()
            );

            return self::hardFallback();
        }
    }

    /**
     * Validate AI output before saving it.
     */
    private static function isValidResult($result): bool
    {
        if (!is_array($result)) {
            return false;
        }

        $requiredFields = [
            'sentiment_category',
            'confidence_score',
            'key_theme',
            'translated_summary'
        ];

        foreach ($requiredFields as $field) {
            if (!array_key_exists($field, $result)) {
                return false;
            }
        }

        if (!in_array(
            $result['sentiment_category'],
            ['Positive', 'Negative', 'Neutral', 'Mixed'],
            true
        )) {
            return false;
        }

        if (
            !is_int($result['confidence_score']) ||
            $result['confidence_score'] < 50 ||
            $result['confidence_score'] > 100
        ) {
            return false;
        }

        if (!in_array(
            $result['key_theme'],
            [
                'Staff Courtesy',
                'Processing Speed',
                'Facility Cleanliness',
                'Process Inquiry',
                'No Comments Provided'
            ],
            true
        )) {
            return false;
        }

        if (!is_string($result['translated_summary'])) {
            return false;
        }

        return true;
    }

    /**
     * Absolute last resort if all AI APIs fail.
     */
    private static function hardFallback()
    {
        return [
            'sentiment_category' => 'Neutral',
            'confidence_score' => 0,
            'key_theme' => 'Analysis Pending',
            'translated_summary' => 'AI analysis temporarily unavailable across all networks.'
        ];
    }
}