<?php

namespace App\Http\Controllers\FeedbackCommittee;

use App\Http\Controllers\Controller;
use App\Models\AdminRequest;
use Illuminate\Http\Request;
use App\Events\SystemDataUpdated;
use App\Models\AuditLog;
use App\Models\Feedback;
use Inertia\Inertia;

class FeedbackCommitteeRequestController extends Controller
{
   public function index(Request $request)
    {
        $search = $request->query('search');
        $status = $request->query('status');

        return Inertia::render('FeedbackCommittee/Requests', [
            // Inbox: Requests sent TO the Feedback Committee
            'inboxRequests' => AdminRequest::getRequestsWithAccountDetails('Feedback Committee', 10, $search, $status),
            
            // Outbox: Requests the Committee sent TO the SuperAdmin
            'myRequests'    => AdminRequest::getPersonalRequests(auth()->id(), 10, $search, $status),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'request_type' => 'required|string|max:100',
            'details'      => 'required|string|max:1000',
        ]);

        $adminReq = AdminRequest::create([
            'admin_id'     => auth()->id(),
            'recipient'    => 'SuperAdmin', // FC always sends technical requests to SuperAdmin
            'request_type' => $validated['request_type'],
            'details'      => $validated['details'],
            'status'       => 'Pending',
        ]);

        // --- AUDIT TRAIL ---
        AuditLog::logAction('Created', 'Admin Requests', "Submitted a {$validated['request_type']} ticket to SuperAdmin (ID: {$adminReq->id}).");

        // REAL-TIME TRIGGER: Instantly light up the SuperAdmin's notification bell
        event(new  SystemDataUpdated('superadmin'));

        return back()->with('success', 'Your ticket has been successfully sent to the SuperAdmin.');
    }

    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status'  => 'required|string|in:Approved,Rejected',
            'remarks' => 'nullable|string'
        ]);

        $adminReq = AdminRequest::findOrFail($id);
        
        // Security check: Only allow updates on requests routed to the FC
        if ($adminReq->recipient !== 'Feedback Committee') {
            abort(403, 'Unauthorized action.');
        }

        $adminReq->status = $request->status;
        if ($request->status === 'Rejected' && $request->filled('remarks')) {
            $adminReq->remarks = $request->remarks;
        }
        $adminReq->save();

        // --- AUDIT TRAIL ---
        $actionWord = $request->status;
        $remarksLog = $request->filled('remarks') ? " Remarks: {$request->remarks}" : "";
        AuditLog::logAction($actionWord, 'Admin Requests', "{$actionWord} focal person request (ID: {$id}).{$remarksLog}");

        // REAL-TIME TRIGGER: Instantly alert the Focal Person that their request was processed
        event(new  SystemDataUpdated('focalperson'));

        $message = $request->status === 'Approved' ? 'Request approved successfully.' : 'Request rejected.';
        return back()->with('success', $message);
    }

   public function destroy(Request $request, $id)
    {
        $role = strtolower(trim(auth()->user()->role ?? ''));

        // 1. Bulk "Mark all as done" from notification bell
        if ($id == 0 || $request->input('clear_all')) {
            AdminRequest::clearAllNotifications($role, auth()->id());
             Feedback::clearAllHarassmentNotifications($role);
            return back();
        }

        // 2. Catch Harassment Alerts from notification bell
        if (str_starts_with($id, 'harassment_')) {
            $responseId = str_replace('harassment_', '', $id);
            \Illuminate\Support\Facades\DB::table('feedback')
                ->where('response_id', $responseId)
                ->update(['is_notified_committee' => true]);
            return back();
        }

        $adminReq = AdminRequest::findOrFail($id);

        // 3. Clear specific notification from bell without clearing from inbox
        if ($request->input('from_notification')) {
            $adminReq->is_notified_committee = true;
            $adminReq->save();
            return back();
        }

        // Scenario 1: FC is cancelling a pending ticket they sent to SuperAdmin
        if ($adminReq->admin_id === auth()->id()) {
            if ($adminReq->status === 'Pending') {
                $adminReq->delete();
                
                // --- AUDIT TRAIL ---
                AuditLog::logAction('Deleted', 'Admin Requests', "Cancelled pending request sent to SuperAdmin (ID: {$id}).");
                
                return back()->with('success', 'Pending request cancelled.');
            }
            return back()->with('error', 'Cannot cancel a processed request.');
        }

        // Scenario 2: FC is clearing a resolved Focal Person request from their Inbox
        if ($adminReq->recipient === 'Feedback Committee') {
            $adminReq->is_cleared_by_committee = true;
            $adminReq->save();
            
            // --- AUDIT TRAIL ---
            AuditLog::logAction('Archived', 'Admin Requests', "Cleared resolved request from inbox (ID: {$id}).");
            
            return back()->with('success', 'Record cleared from your inbox.');
        }

        return back();
    }
}