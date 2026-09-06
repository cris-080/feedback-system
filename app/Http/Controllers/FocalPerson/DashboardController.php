<?php

namespace App\Http\Controllers\FocalPerson;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Form;
use App\Models\Department;
use Illuminate\Support\Facades\Crypt;

class DashboardController extends Controller
{
    public function index()
    {
        $user = auth()->user();
        $departmentId = $user->department_id;

        // Ensure the user actually belongs to a department
        if (!$departmentId) {
            return inertia('FocalPerson/Dashboard', [
                'error' => 'You are not assigned to any department yet. Please contact the SuperAdmin.'
            ]);
        }

        $department = Department::find($departmentId);
        $activeForm = Form::getActiveFormByDepartment($departmentId);
        
        $deploymentData = null;

        if ($activeForm) {
            $secureToken = Crypt::encryptString($activeForm->form_id);
            $baseUrl = url('/feedback?token=' . $secureToken);
            
            $deploymentData = [
                'form_title' => $activeForm->title,
                'qr_link' => $baseUrl,
                'kiosk_link' => $baseUrl . '&kiosk=true',
                'qr_image_url' => 'https://quickchart.io/qr?text=' . urlencode($baseUrl) . '&size=300&margin=2'
            ];
        }

        return inertia('FocalPerson/Dashboard', [
            'departmentName' => $department->department_name,
            'deploymentData' => $deploymentData
        ]);
    }
}