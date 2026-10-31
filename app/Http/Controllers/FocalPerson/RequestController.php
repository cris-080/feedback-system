<?php

namespace App\Http\Controllers\FocalPerson;

use App\Http\Controllers\Controller;
use App\Models\AdminRequest;
use App\Models\Feedback;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\AuditLog;
use Inertia\Inertia;

class RequestController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->query('search');
        $status = $request->query('status');

        return Inertia::render('FocalPerson/Requests', [
            'requests' => AdminRequest::getPersonalRequests(auth()->id(), 10, $search, $status),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'recipient'    => 'required|string|in:SuperAdmin,Feedback Committee',
            'request_type' => 'required|string|max:100',
            'details'      => 'required|string|max:1000',
        ]);

       $adminReq = AdminRequest::create([
            'admin_id'     => auth()->id(),
            'recipient'    => $validated['recipient'],
            'request_type' => $validated['request_type'],
            'details'      => $validated['details'],
            'status'       => 'Pending',
        ]);

        AuditLog::logAction('Created', 'Admin Requests', "Submitted a {$validated['request_type']} request to {$validated['recipient']} (ID: {$adminReq->id}).");

        return back()->with('success', 'Your request has been sent successfully.');
    }

  public function destroy(Request $request, $id)
    {
        $role = strtolower(trim(auth()->user()->role ?? ''));
        $userId = auth()->user()->user_id ?? auth()->id();

        // 1. Bulk "Mark all as done" (Clears BOTH admin_requests and harassment alerts in feedback)
        if ($id == 0 || $request->boolean('clear_all') || $request->input('clear_all') == '1' || $request->query('clear_all') == '1') {
            AdminRequest::clearAllNotifications($role, $userId);
            Feedback::clearAllHarassmentNotifications($role);
            return redirect()->back();
        }

        // 2. Catch Single Harassment Alert Dismissal
        if (str_starts_with((string) $id, 'harassment_')) {
            $responseId = str_replace('harassment_', '', (string) $id);
            DB::table('feedback')->where('response_id', $responseId)->update(['is_notified_committee' => true]);
            return redirect()->back();
        }

        // 3. Single Admin Request Dismissal or History Deletion
        $adminReq = AdminRequest::where('admin_id', $userId)->findOrFail($id);

        if ($request->boolean('from_notification') || $request->input('from_notification') == '1' || $request->query('from_notification') == '1') {
            $adminReq->is_notified_committee = true;
            $adminReq->save();
            return redirect()->back();
        }

        if ($adminReq->status === 'Pending') {
            $adminReq->delete();
            AuditLog::logAction('Deleted', 'Admin Requests', "Cancelled pending request sent to {$adminReq->recipient} (ID: {$id}).");
            return redirect()->back()->with('success', 'Pending request cancelled.');
        }

        $adminReq->is_cleared_by_committee = true;
        $adminReq->save();
        AuditLog::logAction('Archived', 'Admin Requests', "Cleared resolved request from history (ID: {$id}).");

        return redirect()->back()->with('success', 'Record cleared from your history.');
    }
}