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

      // 4. Apply the Keyword Filter across Control Number, Department, Date/Time, Harassment, Sentiment, and Answers
        if (!empty($keyword)) {
            $trimmedKeyword = trim($keyword);
            $like = '%' . $trimmedKeyword . '%';
            $kwLower = strtolower($trimmedKeyword);

            $query->where(function ($q) use ($like, $kwLower) {
                // Control Number & Response ID
                $q->where('feedback.control_number', 'LIKE', $like)
                  ->orWhere('feedback.response_id', 'LIKE', $like)
                  // Department / Office
                  ->orWhere('department.department_name', 'LIKE', $like)
                  // Date & Time Submitted (supports both raw YYYY-MM-DD and formatted "Sep 17, 2026")
                  ->orWhere('feedback.submitted_at', 'LIKE', $like)
                  ->orWhereRaw("DATE_FORMAT(feedback.submitted_at, '%b %e, %Y %h:%i %p') LIKE ?", [$like])
                  ->orWhereRaw("DATE_FORMAT(feedback.submitted_at, '%b %d, %Y') LIKE ?", [$like])
                  ->orWhereRaw("DATE_FORMAT(feedback.submitted_at, '%M %e, %Y') LIKE ?", [$like])
                  // Sentiment Analysis & Confidence Score
                  ->orWhere('sentiment_analysis.sentiment', 'LIKE', $like)
                  ->orWhere('sentiment_analysis.confidence_score', 'LIKE', $like)
                  // Any Feedback Answer Text
                  ->orWhereExists(function ($sub) use ($like) {
                      $sub->select(DB::raw(1))
                          ->from('feedback_answers')
                          ->whereColumn('feedback_answers.response_id', 'feedback.response_id')
                          ->where('feedback_answers.answer_text', 'LIKE', $like);
                  });

                // Pending Sentiment badge text
                if (str_contains('pending analysis', $kwLower)) {
                    $q->orWhereNull('sentiment_analysis.sentiment');
                }

                // Harassment Column: "Reported" / "Harassment"
                if (str_contains('reported', $kwLower) || str_contains('harassment', $kwLower)) {
                    $q->orWhereExists(function ($sub) {
                        $sub->select(DB::raw(1))
                            ->from('feedback_answers as fa')
                            ->join('form_fields as ff', 'fa.field_id', '=', 'ff.field_id')
                            ->whereColumn('fa.response_id', 'feedback.response_id')
                            ->where('ff.field_label', 'LIKE', '%harassment%')
                            ->where('ff.field_label', 'NOT LIKE', '%detail%')
                            ->where('ff.field_label', 'NOT LIKE', '%if yes%')
                            ->whereRaw("LOWER(TRIM(fa.answer_text)) = 'yes'");
                    });
                }

                // Harassment Column: "None"
                if ($kwLower === 'none') {
                    $q->orWhereNotExists(function ($sub) {
                        $sub->select(DB::raw(1))
                            ->from('feedback_answers as fa')
                            ->join('form_fields as ff', 'fa.field_id', '=', 'ff.field_id')
                            ->whereColumn('fa.response_id', 'feedback.response_id')
                            ->where('ff.field_label', 'LIKE', '%harassment%')
                            ->where('ff.field_label', 'NOT LIKE', '%detail%')
                            ->where('ff.field_label', 'NOT LIKE', '%if yes%')
                            ->whereRaw("LOWER(TRIM(fa.answer_text)) = 'yes'");
                    });
                }
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