<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Events\SystemDataUpdated;
use App\Models\Department;
use App\Models\Feedback;
use Inertia\Inertia;

class FeedbackController extends Controller
{
    /**
     * Display the Feedback Datastore list.
     */
    public function index(Request $request)
    {
        $user = auth()->user();
        $rawRole = strtolower(trim($user->role ?? ''));
        $isSuperAdmin = $rawRole === 'superadmin';
        $isFeedbackCommittee = $rawRole === 'feedback committee' || $rawRole === 'feedbackcommittee';
        $filters = $request->only(['search', 'sentiment', 'preset', 'department']);
        
        $feedbacks = Feedback::getPaginatedDatastore($user, $filters);

        return Inertia::render('SuperAdmin/Feedback', [
            'feedbacks'           => $feedbacks,
            'isSuperAdmin'        => $isSuperAdmin,
            'isFeedbackCommittee' => $isFeedbackCommittee,
            'uniqueDepartments'   => ($isSuperAdmin || $isFeedbackCommittee)
                ? Department::orderBy('department_name', 'asc')->pluck('department_name') 
                : [],
            'searchQuery'         => $filters['search'] ?? '',
            'sentimentFilter'     => $filters['sentiment'] ?? '',
            'presetFilter'        => $filters['preset'] ?? '',
            'departmentFilter'    => $filters['department'] ?? '',
        ]);
    }

    /**
     * Archive (soft-delete) a feedback submission and refresh dashboard metrics.
     */
    public function archive($id)
    {
        $feedback = Feedback::findOrFail($id);
        $departmentId = $feedback->form()->value('department_id');

        $feedback->is_notified_superadmin = true;
        $feedback->is_notified_committee = true;
        $feedback->save();
        $feedback->delete();

        try {
            event(new SystemDataUpdated('all', $departmentId));
        } catch (\Throwable $e) {
            // Keep archive succeeding even if broadcast server is offline
        }

        return back()->with('success', "Feedback {$feedback->control_number} has been archived and removed from dashboard analytics.");
    }

    /**
     * Restore an archived feedback submission and refresh dashboard metrics.
     */
    public function restore($id)
    {
        $feedback = Feedback::withTrashed()->findOrFail($id);
        $departmentId = $feedback->form()->value('department_id');

        $feedback->restore();
        $feedback->is_notified_superadmin = true;
        $feedback->is_notified_committee = true;
        $feedback->save();

        try {
            event(new SystemDataUpdated('all', $departmentId));
        } catch (\Throwable $e) {
            // Keep restore succeeding even if broadcast server is offline
        }

        return back()->with('success', "Feedback {$feedback->control_number} has been restored to dashboard analytics.");
    }

    /**
     * Dismiss harassment alert notification(s) for SuperAdmin.
     */
    public function clearNotification(Request $request, $id)
    {
        if ($id == 0 || $request->boolean('clear_all')) {
            Feedback::where('is_notified_superadmin', false)
                ->update(['is_notified_superadmin' => true]);
            return back();
        }

        if (str_starts_with((string) $id, 'harassment_')) {
            $responseId = str_replace('harassment_', '', (string) $id);
            Feedback::where('response_id', $responseId)
                ->update(['is_notified_superadmin' => true]);
        }

        return back();
    }
}