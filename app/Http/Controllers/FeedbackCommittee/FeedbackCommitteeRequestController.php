<?php

namespace App\Http\Controllers\FeedbackCommittee;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\AdminRequest;
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
     * Cancel and remove a pending request.
     */
    public function destroy($id)
    {
        // Find the request by its ID and ensure it is still Pending
        $request = AdminRequest::where('request_id', $id)
            ->where('status', 'Pending')
            ->firstOrFail();
            
        $request->delete();

        return redirect()->back()->with('success', 'Your pending request has been cancelled.');
    }
}