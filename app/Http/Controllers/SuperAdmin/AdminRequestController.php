<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\AdminRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use \App\Models\Feedback;
use Inertia\Inertia;

class AdminRequestController extends Controller
{
    public function index()
    {
        // 1. Delegate the complex join and sorting query to the Model
        return Inertia::render('SuperAdmin/Requests', [
            'requests' => AdminRequest::getRequestsWithAccountDetails()
        ]);
    }

    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status'  => 'required|string|in:Approved,Rejected',
            'remarks' => 'nullable|string'
        ]);

        $adminReq = AdminRequest::findOrFail($id);
        $adminReq->status = $request->status;

        if ($request->status === 'Rejected' && $request->filled('remarks')) {
            $adminReq->remarks = $request->remarks;
        }

        $adminReq->save();

        // Dynamic success message based on the status
        $message = $request->status === 'Approved' 
            ? 'Request has been approved successfully.' 
            : 'Request has been rejected.';

        return redirect()->back()->with('success', $message);
    }

    // Inject Request $request to read the hidden payload
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