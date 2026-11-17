<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Department;
use App\Models\Feedback;
use Inertia\Inertia;

class FeedbackController extends Controller
{
    /**
     * Display the Feedback Datastore list.
     */
    public function index(Request $request)
    {
        $user = auth()->user();
        $isSuperAdmin = $user->role === 'SuperAdmin';
        $filters = $request->only(['search', 'sentiment', 'preset', 'department']);
        
        $feedbacks = Feedback::getPaginatedDatastore($user, $filters);

        return Inertia::render('SuperAdmin/Feedback', [
            'feedbacks'         => $feedbacks,
            'isSuperAdmin'      => $isSuperAdmin,
            'uniqueDepartments' => $isSuperAdmin 
                ? Department::orderBy('department_name', 'asc')->pluck('department_name') 
                : [],
            'searchQuery'       => $filters['search'] ?? '',
            'sentimentFilter'   => $filters['sentiment'] ?? '',
            'presetFilter'      => $filters['preset'] ?? '',
            'departmentFilter'  => $filters['department'] ?? '',
        ]);
    }
}