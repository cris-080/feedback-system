<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\AdminRequest;
use Illuminate\Http\Request;
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
        // 1. Validate incoming HTTP request
        $request->validate([
            'status' => 'required|in:Approved,Rejected,Completed'
        ]);

        // 2. Delegate the database update to the Model
        AdminRequest::updateRequestStatus($id, $request->status);

        // 3. Return HTTP response
        return redirect()->back()->with('success', 'Request status updated successfully!');
    }
}