<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Report;

use Inertia\Inertia;

class ReportController extends Controller
{
    public function generate(Request $request)
    {
        $validated = $request->validate([
            'department_id' => 'required',
            'month'         => 'required|integer|min:1|max:12',
            'year'          => 'required|integer',
            'report_type'   => 'required|in:cc,non-cc'
        ]);

        // Delegate business logic to the Fat Model
        $reportData = Report::generateSnapshot($validated);

        if (!$reportData) {
            return back()->with('error', 'No feedback data found for the selected period.');
        }

        return Inertia::render('SuperAdmin/ReportPreview', [
            'reportData' => $reportData
        ]);
    }

    public function index()
    {
        // Fetch departments for the generation modal dropdown
        $departments = \App\Models\Department::orderBy('department_name')->get();
        
        // Fetch the historical archive of generated reports
        $reports = Report::with(['department', 'generator'])
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return inertia('SuperAdmin/Reports', [
            'departments' => $departments,
            'reports'     => $reports
        ]);
    }
    /**
     * View an archived report
     */
    public function show($id)
    {
        $report = Report::findOrFail($id);

        return Inertia::render('SuperAdmin/ReportPreview', [
            // The JSON snapshot is already cast to an array by the model
            'reportData' => $report->report_data 
        ]);
    }
}