<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Inertia\Inertia;

class FeedbackController extends Controller
{
    /**
     * Display the Feedback Datastore list.
     */
    public function index(Request $request)
    {
        $user = auth()->user();
        $isSuperAdmin = $user->role === 'SuperAdmin';

        // 1. Capture the search and sentiment parameters from the URL
        $keyword = $request->query('search');
        $sentiment = $request->query('sentiment');

        // 2. Base query for the Datastore
        $query = DB::table('feedback')
            ->leftJoin('forms', 'feedback.form_id', '=', 'forms.form_id')
            ->leftJoin('department', 'forms.department_id', '=', 'department.department_id')
            ->leftJoin('sentiment_analysis', 'feedback.response_id', '=', 'sentiment_analysis.response_id')
            ->select(
                'feedback.*',
                DB::raw('COALESCE(department.department_name, "Unknown/Deleted Office") as department_name'),
                'sentiment_analysis.sentiment',
                'sentiment_analysis.confidence_score as sentiment_score'
            );

        // 3. RBAC: If the user is a Focal Person, strictly limit to their department
        if (!$isSuperAdmin) {
            $query->where('forms.department_id', $user->department_id);
        }

        // 4. Apply the Keyword Filter if a word was clicked or searched
        if (!empty($keyword)) {
            $query->whereExists(function ($q) use ($keyword) {
                $q->select(DB::raw(1))
                  ->from('feedback_answers')
                  ->whereColumn('feedback_answers.response_id', 'feedback.response_id')
                  ->where('feedback_answers.answer_text', 'LIKE', '%' . $keyword . '%');
            });
        }

        // Apply Sentiment Filter
        if (!empty($sentiment)) {
            $query->where('sentiment_analysis.sentiment', $sentiment);
        }

        // 5. Execute pagination and preserve search URL parameters
        $feedbacks = $query->orderBy('feedback.submitted_at', 'desc')
                           ->paginate(10)
                           ->withQueryString();

        // 6. Attach the actual answers to each feedback row
        $feedbacks->getCollection()->transform(function ($feedback) {
            $answers = DB::table('feedback_answers')
                ->join('form_fields', 'feedback_answers.field_id', '=', 'form_fields.field_id')
                ->where('feedback_answers.response_id', $feedback->response_id)
                ->pluck('feedback_answers.answer_text', 'form_fields.field_label')
                ->toArray();
            
            // STRICT CAST: This guarantees it becomes a JSON Object {}, preventing UI rendering bugs
            $feedback->answers = (object) $answers; 
            
            return $feedback;
        });

        return Inertia::render('SuperAdmin/Feedback', [
            'feedbacks' => $feedbacks,
            'searchQuery' => $keyword,
            'sentimentFilter' => $sentiment 
        ]);
    }
}