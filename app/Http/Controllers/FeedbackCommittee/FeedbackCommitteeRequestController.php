<?php

namespace App\Http\Controllers\FeedbackCommittee;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class FeedbackCommitteeRequestController extends Controller
{
    // Fetches ONLY the personal requests made by the logged-in Feedback Committee member
    public function index()
    {
        $requests = DB::table('admin_requests')
            ->where('admin_id', Auth::id())
            ->orderBy('created_at', 'desc')
            ->get();

        // Updated to point to your new React folder structure!
        return Inertia::render('FeedbackCommittee/Requests', [
            'requests' => $requests
        ]);
    }

    // Allows the Feedback Committee to submit a new ticket
    public function store(Request $request)
    {
        $request->validate([
            'request_type' => 'required|string|max:255',
            'details' => 'required|string',
        ]);

        DB::table('admin_requests')->insert([
            'admin_id' => Auth::id(), 
            'request_type' => $request->request_type,
            'details' => $request->details,
            'status' => 'Pending',
            'created_at' => now(),
            'updated_at' => now()
        ]);

        return redirect()->back()->with('success', 'Your request has been sent to the SuperAdmin.');
    }
}