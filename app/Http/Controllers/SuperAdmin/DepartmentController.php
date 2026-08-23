<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\DepartmentService;
use App\Http\Requests\StoreDepartmentRequest;
use App\Http\Requests\UpdateDepartmentRequest;
use App\Http\Resources\DepartmentResource;
use Illuminate\Http\Request;
use App\Mail\FormLinkMail;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Crypt;
use App\Models\Account;
use App\Models\Form;
use Inertia\Inertia;

class DepartmentController extends Controller
{
    public function index(Request $request)
    {
        $departments = Department::with(['services', 'focalPerson'])
            ->search($request->search)
            ->orderBy('department_name', 'asc')
            ->paginate(10);

        return Inertia::render('SuperAdmin/Departments', [
            'departments'  => DepartmentResource::collection($departments),
            'filters'      => $request->only(['search'])
        ]);
    }

    public function store(StoreDepartmentRequest $request)
    {
        $payload = [
            'department_name' => trim($request->validated('name')),
            'description'     => trim($request->validated('description') ?? ''),
        ];

        // Delegate to Fat Model
        Department::createDepartment($payload);

        return back()->with('success', 'Department successfully provisioned. You can now assign a Focal Person from the Users tab.');
    }

    public function emailFocalPerson(Request $request, $departmentId)
    {
        $department = Department::findOrFail($departmentId);

        $focalPerson = Account::getFocalPersonByDepartment($departmentId);

        if (!$focalPerson || empty($focalPerson->email)) {
            return back()->withErrors(['error' => 'No focal person email found for this department.']);
        }

        $activeForm = Form::getActiveFormByDepartment($departmentId);

        if (!$activeForm) {
            return back()->withErrors(['error' => 'This department does not have an active published form. Publish a form first!']);
        }

        $secureToken = Crypt::encryptString($activeForm->form_id);
        $formLink = url('/feedback?token=' . $secureToken);

        Mail::to($focalPerson->email)->send(new FormLinkMail($formLink, $department->department_name));

        return back()->with('success', 'Form link successfully emailed to ' . $focalPerson->firstname . ' ' . $focalPerson->lastname);
    }

    public function update(UpdateDepartmentRequest $request, $id)
    {
        $department = Department::findOrFail($id);
        
        $payload = [
            'department_name' => trim($request->validated('name')),
            'description'     => trim($request->validated('description') ?? ''),
        ];

        // Delegate to Fat Model
        $department->updateDepartment($payload);

        return back()->with('success', 'Department successfully updated.');
    }

   public function destroy($id)
    {
        $department = Department::findOrFail($id);

        DepartmentService::where('department_id', $id)->delete();
        Account::where('department_id', $id)->update(['department_id' => null]);
        Form::where('department_id', $id)->update(['department_id' => null]);

        $department->delete();

        return back()->with('success', 'Department deleted. Associated forms and accounts are now unassigned.');
    }

    public function addService(Request $request, $departmentId)
    {
       $request->validate(['service_name' => 'required|string|max:255']);
        
        $department = Department::findOrFail($departmentId);

        $department->services()->create([
            'service_name' => trim($request->service_name)
        ]);

        return back()->with('success', 'Service added to department.');
    }

    public function removeService($id) 
    {
        $service = DepartmentService::findOrFail($id);
        $service->delete();

        return back()->with('success', 'Service successfully removed.');
    }
}