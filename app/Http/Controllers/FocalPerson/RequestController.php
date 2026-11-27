<?php

namespace App\Http\Controllers\FocalPerson;

use App\Http\Controllers\Controller;
use App\Events\SystemDataUpdated;
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
        $user = auth()->user();

        return Inertia::render('FocalPerson/Requests', [
            'requests'   => AdminRequest::getPersonalRequests(auth()->id(), 10, $search, $status, 'Feedback Committee'),
            'carNotices' => AdminRequest::getCorrectiveActions($user->department_id, 10, $search, $status),
        ]);
    }

    public function respondCar(Request $request, $id)
    {
        $validated = $request->validate([
            'fp_response' => 'required|string|max:1500',
        ]);

        $user = auth()->user();
        $car = AdminRequest::where('request_id', $id)
            ->where('recipient', 'Focal Person')
            ->where('target_department_id', $user->department_id)
            ->firstOrFail();

        if ($car->status === 'Closed') {
            return back()->with('error', 'This compliance notice has already been closed.');
        }

        $car->fp_response = $validated['fp_response'];
        $car->status = 'Addressed';
        $car->is_notified_focal = true;
        $car->is_notified_committee = false;
        $car->save();

        AuditLog::logAction(
            'Updated',
            'Corrective Actions',
            "Submitted action taken for CAR (ID: {$car->request_id})."
        );

        try {
            event(new SystemDataUpdated('feedbackcommittee', $car->target_department_id));
        } catch (\Throwable $e) {
            // Keep response succeeding even if Reverb is offline
        }

        return back()->with('success', 'Action taken submitted to the Feedback Committee for verification.');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'request_type' => 'required|string|max:100',
            'details'      => 'required|string|max:1000',
        ]);

        $adminReq = AdminRequest::create([
            'admin_id'     => auth()->id(),
            'recipient'    => 'Feedback Committee',
            'request_type' => $validated['request_type'],
            'details'      => $validated['details'],
            'status'       => 'Pending',
        ]);

        AuditLog::logAction('Created', 'Admin Requests', "Submitted a {$validated['request_type']} request to Feedback Committee (ID: {$adminReq->request_id}).");

        try {
            event(new SystemDataUpdated('feedbackcommittee', auth()->user()->department_id));
        } catch (\Throwable $e) {
            // Keep submission succeeding even if Reverb is offline
        }

        return back()->with('success', 'Your request has been sent to the Feedback Committee.');
    }

  public function destroy(Request $request, $id)
    {
        $role = strtolower(trim(auth()->user()->role ?? ''));
        $userId = auth()->user()->user_id ?? auth()->id();

        $deptId = auth()->user()->department_id;

        // 1. Bulk "Mark all as done" (Clears BOTH admin_requests and harassment alerts in feedback)
        if ($id == 0 || $request->boolean('clear_all') || $request->input('clear_all') == '1' || $request->query('clear_all') == '1') {
            AdminRequest::clearAllNotifications($role, $userId, $deptId);
            Feedback::clearAllHarassmentNotifications($role);
            return redirect()->back();
        }

        // 2. Catch Single Harassment Alert Dismissal
        if (str_starts_with((string) $id, 'harassment_')) {
            $responseId = str_replace('harassment_', '', (string) $id);
            DB::table('feedback')->where('response_id', $responseId)->update(['is_notified_committee' => true]);
            return redirect()->back();
        }

        // 3. Single Notification Dismissal (handles both outgoing requests and incoming CAR notices)
        if ($request->boolean('from_notification') || $request->input('from_notification') == '1' || $request->query('from_notification') == '1') {
            $adminReq = AdminRequest::where('request_id', $id)
                ->where(function ($q) use ($userId, $deptId) {
                    $q->where('admin_id', $userId)
                      ->orWhere(function ($sub) use ($deptId) {
                          $sub->where('recipient', 'Focal Person')
                              ->where('target_department_id', $deptId);
                      });
                })
                ->firstOrFail();

            if ($adminReq->recipient === 'Focal Person' && (int) $adminReq->target_department_id === (int) $deptId) {
                $adminReq->is_notified_focal = true;
            } else {
                $adminReq->is_notified_committee = true;
            }
            $adminReq->save();
            return redirect()->back();
        }

        // 4. Single Admin Request History Deletion / Cancellation
        $adminReq = AdminRequest::where('admin_id', $userId)->findOrFail($id);

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