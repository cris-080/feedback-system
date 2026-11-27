<?php

namespace App\Http\Controllers\FeedbackCommittee;

use App\Http\Controllers\Controller;
use App\Models\AdminRequest;
use Illuminate\Http\Request;
use App\Events\SystemDataUpdated;
use App\Models\AuditLog;
use App\Models\Department;
use App\Models\Feedback;
use Inertia\Inertia;

class FeedbackCommitteeRequestController extends Controller
{
    private function ensureFeedbackCommittee(): void
    {
        $role = strtolower(trim(auth()->user()->role ?? ''));
        if (!in_array($role, ['feedback committee', 'feedbackcommittee'])) {
            abort(403, 'Unauthorized Access: Requests management is restricted to the Feedback Committee.');
        }
    }

    public function index(Request $request)
    {
        $this->ensureFeedbackCommittee();

        $search = $request->query('search');
        $status = $request->query('status');

        $departments = Department::leftJoin('account', function ($join) {
                $join->on('department.focal_person_id', '=', 'account.user_id')
                     ->whereNull('account.deleted_at');
            })
            ->select(
                'department.department_id',
                'department.department_name',
                'account.firstname as fp_firstname',
                'account.lastname as fp_lastname'
            )
            ->orderBy('department.department_name', 'asc')
            ->get();

        return Inertia::render('FeedbackCommittee/Requests', [
            // Inbox: Requests sent by Focal Persons TO the Feedback Committee
            'inboxRequests' => AdminRequest::getRequestsWithAccountDetails('Feedback Committee', 10, $search, $status),

            // CARs: Corrective Action Requests issued TO Focal Persons
            'carRequests'   => AdminRequest::getCorrectiveActions(null, 10, $search, $status),
            'departments'   => $departments,
        ]);
    }

    public function storeCar(Request $request)
    {
        $this->ensureFeedbackCommittee();

        $validated = $request->validate([
            'target_department_id' => 'required|integer|exists:department,department_id',
            'request_type'         => 'required|string|max:100',
            'priority'             => 'required|string|in:Normal,Urgent',
            'due_date'             => 'nullable|date|after_or_equal:today',
            'details'              => 'required|string|max:1500',
        ]);

        $department = Department::findOrFail($validated['target_department_id']);

        $car = AdminRequest::create([
            'admin_id'             => auth()->id(),
            'recipient'            => 'Focal Person',
            'target_department_id' => $department->department_id,
            'request_type'         => $validated['request_type'],
            'priority'             => $validated['priority'],
            'due_date'             => $validated['due_date'] ?? null,
            'details'              => $validated['details'],
            'status'               => 'Pending',
            'is_notified_focal'    => false,
        ]);

        AuditLog::logAction(
            'Created',
            'Corrective Actions',
            "Issued {$validated['priority']} CAR ({$validated['request_type']}) to {$department->department_name} (ID: {$car->request_id})."
        );

        try {
            event(new SystemDataUpdated('focalperson', $department->department_id));
        } catch (\Throwable $e) {
            // Keep CAR creation succeeding even if Reverb is offline
        }

        return back()->with('success', "Corrective Action Request issued to {$department->department_name}.");
    }

    public function closeCar(Request $request, $id)
    {
        $this->ensureFeedbackCommittee();

        $validated = $request->validate([
            'remarks' => 'nullable|string|max:1000',
        ]);

        $car = AdminRequest::findOrFail($id);

        if ($car->recipient !== 'Focal Person') {
            abort(403, 'Unauthorized action.');
        }

        $car->status = 'Closed';
        if (!empty($validated['remarks'])) {
            $car->remarks = $validated['remarks'];
        }
        $car->is_notified_focal = false;
        $car->save();

        AuditLog::logAction('Updated', 'Corrective Actions', "Verified and closed CAR (ID: {$car->request_id}).");

        try {
            event(new SystemDataUpdated('focalperson', $car->target_department_id));
        } catch (\Throwable $e) {
            // Keep close succeeding even if Reverb is offline
        }

        return back()->with('success', 'Corrective Action Request marked as Closed.');
    }

    public function updateStatus(Request $request, $id)
    {
        $this->ensureFeedbackCommittee();

        $request->validate([
            'status'  => 'required|string|in:Approved,Rejected',
            'remarks' => 'nullable|string'
        ]);

        $adminReq = AdminRequest::findOrFail($id);

        if ($adminReq->recipient !== 'Feedback Committee') {
            abort(403, 'Unauthorized action.');
        }

        $adminReq->status = $request->status;
        if ($request->status === 'Rejected' && $request->filled('remarks')) {
            $adminReq->remarks = $request->remarks;
        }
        $adminReq->is_notified_committee = false;
        $adminReq->save();

        $actionWord = $request->status;
        $remarksLog = $request->filled('remarks') ? " Remarks: {$request->remarks}" : "";
        AuditLog::logAction($actionWord, 'Admin Requests', "{$actionWord} focal person request (ID: {$id}).{$remarksLog}");

        event(new SystemDataUpdated('focalperson'));

        $message = $request->status === 'Approved' ? 'Request approved successfully.' : 'Request rejected.';
        return back()->with('success', $message);
    }

    public function destroy(Request $request, $id)
    {
        $this->ensureFeedbackCommittee();

        $role = strtolower(trim(auth()->user()->role ?? ''));

        // 1. Bulk "Mark all as done" from notification bell
        if ($id == 0 || $request->input('clear_all')) {
            AdminRequest::clearAllNotifications($role, auth()->id());
            Feedback::clearAllHarassmentNotifications($role);
            return back();
        }

        // 2. Catch Harassment Alerts from notification bell
        if (str_starts_with((string) $id, 'harassment_')) {
            $responseId = str_replace('harassment_', '', (string) $id);
            \Illuminate\Support\Facades\DB::table('feedback')
                ->where('response_id', $responseId)
                ->update(['is_notified_committee' => true]);
            return back();
        }

        $adminReq = AdminRequest::findOrFail($id);

        // 3. Clear specific notification from bell without removing record
        if ($request->input('from_notification')) {
            $adminReq->is_notified_committee = true;
            $adminReq->save();
            return back();
        }

        // Scenario 1: FC is cancelling a pending CAR issued to a Focal Person
        if ($adminReq->recipient === 'Focal Person' && $adminReq->admin_id === auth()->id()) {
            if ($adminReq->status === 'Pending') {
                $adminReq->delete();
                AuditLog::logAction('Deleted', 'Corrective Actions', "Cancelled pending CAR (ID: {$id}).");
                return back()->with('success', 'Pending corrective action notice cancelled.');
            }
            return back()->with('error', 'Cannot cancel a processed notice.');
        }

        // Scenario 2: FC is clearing a resolved Focal Person request from their Inbox
        if ($adminReq->recipient === 'Feedback Committee') {
            $adminReq->is_cleared_by_committee = true;
            $adminReq->save();
            AuditLog::logAction('Archived', 'Admin Requests', "Cleared resolved request from inbox (ID: {$id}).");
            return back()->with('success', 'Record cleared from your inbox.');
        }

        return back();
    }
}