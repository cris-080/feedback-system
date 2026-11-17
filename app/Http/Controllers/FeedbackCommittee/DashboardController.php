<?php

namespace App\Http\Controllers\FeedbackCommittee;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Http\Controllers\SuperAdmin\DashboardController as SuperAdminDashboard;

class DashboardController extends Controller
{
    /**
     * Re-use the heavy SuperAdmin Dashboard logic, 
     * but run it under the Feedback Committee's route context.
     */
    public function index(Request $request)
    {
        $superAdminDashboard = new SuperAdminDashboard();
        return $superAdminDashboard->index($request);
    }
}