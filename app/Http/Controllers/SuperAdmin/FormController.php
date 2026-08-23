<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Form;
use App\Models\Department;
use App\Models\DepartmentService;
use App\Services\FormService;
use App\Http\Requests\StoreFormRequest;
use App\Http\Requests\UpdateFormVersionRequest;
use App\Http\Resources\FormResource;
use Illuminate\Http\Request;
use Inertia\Inertia;

class FormController extends Controller
{
    protected $formService;

    public function __construct(FormService $formService)
    {
        $this->formService = $formService;
    }

    public function index(Request $request)
    {
        $filters = $request->only(['search', 'department']);

        return Inertia::render('SuperAdmin/ManageForms', [
            'forms'             => FormResource::collection(Form::getPaginatedActiveForms($filters)),
            'uniqueDepartments' => Department::orderBy('department_name', 'asc')->pluck('department_name'),
            'filters'           => $filters
        ]);
    }

    public function store(StoreFormRequest $request)
    {
        $this->formService->createForm($request->validated());
        return back()->with('success', 'Form blueprint successfully created and saved to Drafts.');
    }

    public function archive($id)
    {
        $form = Form::findOrFail($id);
        $this->formService->archiveForm($form);
        
        return back()->with('success', 'Form successfully archived');
    }

    public function publish(Request $request, $id)
    {
        $request->validate([
            'department_id' => 'nullable|integer|exists:department,department_id'
        ]);
        
        $form = Form::findOrFail($id);
        
        // Pass department ID to the publish handler
        $this->formService->publishForm($form, $request->input('department_id'));

        return back()->with('success', "Form published successfully! Previous active {$form->form_type} form for this department has been archived.");
    }
    public function clone($id)
    {
        $form = Form::with('fields.options')->findOrFail($id);
        $this->formService->cloneForm($form);

        return back()->with('success', 'Form cloned successfully! You can now edit the newly created Draft.');
    }

    public function edit($id)
    {
        $currentForm = Form::getFormWithFields($id);

        return Inertia::render('SuperAdmin/EditForm', [
            'currentForm'        => new FormResource($currentForm),
            'departments'        => Department::getDropdownList(), // From previous refactor
            'departmentServices' => DepartmentService::getGroupedServices(),
            'existingFields'     => $currentForm->getFormattedFields(),
        ]);
    }

    public function update(UpdateFormVersionRequest $request, $id)
    {
        $oldForm = Form::findOrFail($id);
        $this->formService->updateFormVersion($oldForm, $request->validated());

        return redirect()->route('superadmin.forms.index')->with('success', 'Form updated successfully! (New version created)');
    }

    public function destroy($id)
    {
        $form = Form::findOrFail($id);
        
        try {
            $this->formService->deleteForm($form);
            return to_route('superadmin.forms.index')->with('success', 'Form permanently deleted.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function softDelete($id)
    {
        $form = Form::findOrFail($id);
        $form->delete();

        return back()->with('success', 'Archived form successfully deleted.');
    }

    public function archives(Request $request)
    {
        $filters = $request->only(['search', 'department']);

        return Inertia::render('SuperAdmin/Archives', [
            'archivedForms'     => FormResource::collection(Form::getPaginatedArchivedForms($filters)),
            'uniqueDepartments' => Form::getArchivedUniqueDepartments(),
            'filters'           => $filters
        ]);
    }

    public function restore($id)
    {
        $form = Form::findOrFail($id);
        $form->update(['status' => 'Draft']);

        return back()->with('success', 'Form successfully restored to Active Drafts.');
    }
}