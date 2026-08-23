<?php
namespace App\Http\Controllers\SuperAdmin;

use Illuminate\Support\Facades\Mail;
use App\Mail\DepartmentDeploymentKit;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use SimpleSoftwareIO\QrCode\Facades\QrCode as QrGenerator;
use App\Models\QrCode;
use App\Models\Department; // Imported for the index method dropdown
use Inertia\Inertia; // Imported to render the React page

class QrCodeController extends Controller
{
    // Renders the Deployment Hub page
    public function index()
    {
        // Fetch all departments to populate the form dropdown
        $departments = Department::all(); 

        return Inertia::render('SuperAdmin/ManageQrCodes', [
            'departments' => $departments
        ]);
    }

    // Handles the form submission and emails the Deployment Kit
    public function store(Request $request)
    {
        // 1. Validate the incoming data, including the new email field
        $request->validate([
            'department_id'      => 'required|integer|exists:department,department_id',
            'label'              => 'required|string|max:255',
            'focal_person_email' => 'required|email',
        ]);

        // 2. Generate the unique secure token
        $token = Str::random(40);

        // 3. Save the new Desk QR Code record
        $qrRecord = QrCode::create([
            'qr_token'      => $token,
            'label'         => $request->label,
            'department_id' => $request->department_id,
            'is_active'     => 1,
            'created_at'    => now(),
            'expires_at'    => null, 
        ]);

        // 4. Send the Email to the Focal Person
        Mail::to($request->focal_person_email)->send(new DepartmentDeploymentKit($qrRecord));

        // 5. Return success to React
        return response()->json([
            'success' => true,
            'message' => 'Deployment kit emailed successfully!'
        ]);
    }
}