<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;

class FeedbackController extends Controller
{
    /**
         * Display the Feedback Datastore list.
         */
        public function index()
        {
            $user = auth()->user();
            $isSuperAdmin = $user->role === 'SuperAdmin';

        // Base query
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

        // RBAC: If the user is a Focal Person, strictly limit to their department
        if (!$isSuperAdmin) {
            $query->where('forms.department_id', $user->department_id);
        }

        // Execute query with pagination
        $feedbacks = $query->orderBy('feedback.submitted_at', 'desc')->paginate(10); 

        // Attach the actual answers to each feedback row
        $feedbacks->getCollection()->transform(function ($feedback) {
            $answers = DB::table('feedback_answers')
                ->join('form_fields', 'feedback_answers.field_id', '=', 'form_fields.field_id')
                ->where('feedback_answers.response_id', $feedback->response_id)
                ->pluck('feedback_answers.answer_text', 'form_fields.field_label')
                ->toArray();
            
            $feedback->answers = $answers;
            return $feedback;
        });

        return inertia('SuperAdmin/Feedback', [
            'feedbacks' => $feedbacks
        ]);
    }
}