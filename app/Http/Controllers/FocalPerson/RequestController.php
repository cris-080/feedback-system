<?php

namespace App\Http\Controllers\FocalPerson;

use App\Http\Controllers\Controller;
use App\Models\AdminRequest;
use Illuminate\Http\Request;
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

   public function destroy($id)
    {
        $adminReq = AdminRequest::where('admin_id', auth()->id())->findOrFail($id);
        $status = $adminReq->status;

       if ($status === 'Pending') {
            $adminReq->delete();
            AuditLog::logAction('Deleted', 'Admin Requests', "Cancelled pending request sent to {$adminReq->recipient} (ID: {$id}).");
            return back()->with('success', 'Pending request cancelled.');
        }

        $adminReq->is_cleared_by_committee = true;
        $adminReq->save();
        AuditLog::logAction('Archived', 'Admin Requests', "Cleared resolved request from history (ID: {$id}).");

        return back()->with('success', 'Record cleared from your history.');
    }
}