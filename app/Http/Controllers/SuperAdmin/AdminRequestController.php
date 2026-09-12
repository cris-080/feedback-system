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
    $request->validate([
        'status'  => 'required|string|in:Approved,Rejected',
        'remarks' => 'nullable|string'
    ]);

    $adminReq = \App\Models\AdminRequest::findOrFail($id);
    $adminReq->status = $request->status;

    if ($request->status === 'Rejected' && $request->filled('remarks')) {
        $adminReq->remarks = $request->remarks;
    }

    $adminReq->save();

    return redirect()->back()->with('success', 'Request status updated successfully.');
}
}