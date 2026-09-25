<?php

namespace App\Http\Controllers\FeedbackCommittee;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Models\AdminRequest;
use \App\Models\Feedback;
use Inertia\Inertia;

class FeedbackCommitteeRequestController extends Controller
{
    // Fetches ONLY the personal requests made by the logged-in Feedback Committee member (Paginated)
    public function index()
    {
        // Calling the Fat Model method
        $requests = AdminRequest::getPersonalRequests(Auth::id(), 10);

        return Inertia::render('FeedbackCommittee/Requests', [
            'requests' => $requests
        ]);
    }

    // Allows the Feedback Committee to submit a new ticket
    public function store(Request $request)
    {
        $validated = $request->validate([
            'request_type' => 'required|string|max:255',
            'details'      => 'required|string',
        ]);

        // Using Eloquent instead of DB facade
        AdminRequest::create([
            'admin_id'     => Auth::id(), 
            'request_type' => $validated['request_type'],
            'details'      => $validated['details'],
            'status'       => 'Pending',
        ]);

        return redirect()->back()->with('success', 'Your request has been sent to the SuperAdmin.');
    }

    /**
     * Cancel, hide, or clear requests based on where the action originated.
     */
    public function destroy(Request $request, $id)
    {
        $role = strtolower(trim(auth()->user()->role ?? ''));

        // 1. Bulk "Mark all as done" (Clears BOTH tables)
        if ($id == 0 || $request->input('clear_all')) {
            AdminRequest::clearAllNotifications($role, auth()->user()->user_id);
            Feedback::clearAllHarassmentNotifications($role);
            return redirect()->back();
        }

        // 2. NEW: Catch Harassment Alerts
        if (str_starts_with($id, 'harassment_')) {
            $responseId = str_replace('harassment_', '', $id);
            if ($role === 'superadmin') {
                DB::table('feedback')->where('response_id', $responseId)->update(['is_notified_superadmin' => true]);
            } else {
                DB::table('feedback')->where('response_id', $responseId)->update(['is_notified_committee' => true]);
            }
            return redirect()->back();
        }

        // 3. Normal Admin Request Clearing
        $adminReq = AdminRequest::findOrFail($id);

        if ($request->input('from_notification')) {
            if ($role === 'superadmin') {
                $adminReq->is_notified_superadmin = true;
            } else {
                $adminReq->is_notified_committee = true;
            }
        } else {
            if ($role === 'superadmin') {
                $adminReq->is_cleared_by_superadmin = true;
            } else {
                $adminReq->is_cleared_by_committee = true;
            }
        }
        
        $adminReq->save();
        return redirect()->back();
    }
}