<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use App\Models\Department;
use App\Models\DepartmentService;
use App\Models\ServiceProvider; // <-- NEW: Import ServiceProvider
use App\Models\FormField;
use App\Models\Form;
use Inertia\Inertia;

class FormBuilderController extends Controller
{
    /**
     * Display the Form Builder UI and pass required data to React.
     */
    public function create()
    {
        return Inertia::render('SuperAdmin/FormBuilder', [
            'departments'         => Department::all(), 
            'departmentServices'  => DepartmentService::getGroupedServices(),
            
            // NEW: Fetch all providers grouped by department so React can read them instantly
            'departmentProviders' => ServiceProvider::all()->groupBy('department_id'), 
            
            'initialFields'       => FormField::getBaselineFieldsFormatted(),
        ]);
    }
    
    /**
     * Display the forms table with server-side pagination and filtering.
     */
    public function index(Request $request)
    {
        $filters = $request->only(['search', 'status', 'department']);

        return Inertia::render('SuperAdmin/ManageForms', [
            'forms'             => Form::getBuilderPaginatedForms($filters),
            'uniqueDepartments' => Form::getBuilderUniqueDepartments(),
            'filters'           => $filters
        ]);
    }

    /**
     * Store a newly created dynamic form in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title'              => 'required|string|max:255',
            'department_id'      => 'required|integer',
            'form_type'          => 'required|string|in:CC,Non-CC',
            'description'        => 'nullable|string',
            'fields'             => 'required|array',
            
            // Text overrides
            'header_1'           => 'nullable|string|max:255',
            'header_2'           => 'nullable|string|max:255',
            'header_3'           => 'nullable|string|max:255',
            'tagline'            => 'nullable|string|max:255',
            'step_1_instruction' => 'nullable|string',
            'step_2_instruction' => 'nullable|string',
        ]);

        // ENFORCE: One Form Type Per Department (Active/Draft only)
        $departmentId = $validated['department_id'] ?? null;
        $conflictExists = Form::where('department_id', $departmentId)
            ->where('form_type', $validated['form_type'])
            ->whereIn('status', ['Active', 'Draft'])
            ->exists();

        if ($conflictExists) {
            return back()->with('error', "Action Denied: This department already has an Active or Draft {$validated['form_type']} form. You must archive it before creating a new one.");
        }

        // Delegate Database Transaction to the Model
        Form::storeDynamicForm($validated);

        return to_route('superadmin.forms.index')->with('success', 'Form blueprint created successfully!');
    }
    /**
     * Display the edit form builder for an existing form.
     */
    public function edit($id)
    {
        $form = Form::getFormWithFields($id);
        
        return Inertia::render('SuperAdmin/EditForm', [
            'currentForm'         => $form,
            'existingFields'      => $form->getFormattedFields(), 
            'departments'         => Department::getDropdownList(),
            'departmentServices'  => DepartmentService::getGroupedServices(),
            
            // NEW: Pass the providers here as well for editing
            'departmentProviders' => ServiceProvider::all()->groupBy('department_id'), 
        ]);
    }

    /**
     * Archive the old form and store a new version.
     */
    public function update(Request $request, $id): RedirectResponse
    {
        $validated = $request->validate([
            'title'              => 'required|string|max:255',
            'department_id'      => 'required|integer',
            'form_type'          => 'required|string|in:CC,Non-CC',
            'description'        => 'nullable|string',
            'fields'             => 'required|array',
            
            // Text overrides
            'header_1'           => 'nullable|string|max:255',
            'header_2'           => 'nullable|string|max:255',
            'header_3'           => 'nullable|string|max:255',
            'tagline'            => 'nullable|string|max:255',  
            'step_1_instruction' => 'nullable|string',
            'step_2_instruction' => 'nullable|string',          
        ]);

        $oldForm = Form::findOrFail($id);
        $departmentId = $validated['department_id'] ?? null;

        // ENFORCE: Prevent changing an existing form into a conflicting type/department
        $conflictExists = Form::where('department_id', $departmentId)
            ->where('form_type', $validated['form_type'])
            ->whereIn('status', ['Active', 'Draft'])
            ->where('form_group_id', '!=', $oldForm->form_group_id) // Ignore its own history group
            ->exists();

        if ($conflictExists) {
            return back()->with('error', "Action Denied: This department already has an Active or Draft {$validated['form_type']} form. You must archive it first.");
        }

        // Delegate Versioning Logic to the Model
        Form::createNewFormVersion($id, $validated);

        return to_route('superadmin.forms.index')->with('success', 'New form version published successfully!');
    }
}