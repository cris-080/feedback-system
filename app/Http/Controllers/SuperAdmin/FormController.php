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
use Illuminate\Validation\ValidationException;
use Illuminate\Http\Request;
use App\Models\AuditLog;
use Illuminate\Support\Facades\Crypt;
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
        $userRole = strtolower(trim(auth()->user()->role ?? ''));
        $isSuperAdmin = $userRole === 'superadmin';
        $isFeedbackCommittee = $userRole === 'feedback committee' || $userRole === 'feedbackcommittee';
        
        // FIX: Added 'status' so Laravel actually listens to the React dropdown!
        $filters = $request->only(['search', 'status', 'department']);

        // RBAC: If the user is a Focal Person, forcefully override the department filter
        // We skip this restriction for SuperAdmins AND the Feedback Committee
        if (!$isSuperAdmin && !$isFeedbackCommittee) {
            $departmentName = Department::where('department_id', auth()->user()->department_id)->value('department_name');
            $filters['department'] = $departmentName; 
        }

        return Inertia::render('SuperAdmin/ManageForms', [
            'forms'             => FormResource::collection(Form::getPaginatedActiveForms($filters)),
            
            // Both SuperAdmin and Feedback Committee need the full list of departments for the dropdown
            'uniqueDepartments' => ($isSuperAdmin || $isFeedbackCommittee) ? Department::orderBy('department_name', 'asc')->pluck('department_name') : [],
            'filters'           => $filters,
            'isSuperAdmin'      => $isSuperAdmin // This strictly controls the action buttons in ManageForms.jsx
        ]);
    }

   public function store(StoreFormRequest $request)
    {
        $this->formService->createForm($request->validated());
        
        // --- AUDIT TRAIL ---
         AuditLog::logAction('Created', 'Forms', 'Created a new form blueprint and saved to Drafts.');
        
        return back()->with('success', 'Form blueprint successfully created and saved to Drafts.');
    }

    public function archive($id)
    {
        $form = Form::findOrFail($id);
        $this->formService->archiveForm($form);
        
        // --- AUDIT TRAIL ---
        AuditLog::logAction('Archived', 'Forms', "Archived form (ID: {$id}).");
        
        return back()->with('success', 'Form successfully archived');
    }

    public function publish(Request $request, $id)
    {
        $request->validate(['department_id' => 'nullable|integer|exists:department,department_id']);
        
        $form = Form::findOrFail($id);
        $targetDepartmentId = $request->input('department_id') ?? $form->department_id;
        
        $this->formService->publishForm($form, $targetDepartmentId);

        AuditLog::logAction('Published', 'Forms', "Published {$form->form_type} form (ID: {$id}) and archived the previously active version.");

        return back()->with('success', "Form published successfully! Previous active {$form->form_type} form for this department has been archived.");
    }
    
    public function clone($id)
    {
        $form = Form::with('fields.options')->findOrFail($id);
        $this->formService->cloneForm($form);

        // --- AUDIT TRAIL ---
        AuditLog::logAction('Created', 'Forms', "Cloned form (ID: {$id}) into a new Draft.");

        return back()->with('success', 'Form cloned successfully! You can now edit the newly created Draft.');
    }

   

   public function update(UpdateFormVersionRequest $request, $id)
    {
        $oldForm = Form::findOrFail($id);
        $this->formService->updateFormVersion($oldForm, $request->validated());

        // --- AUDIT TRAIL ---
        AuditLog::logAction('Updated', 'Forms', "Updated form (ID: {$id}) by creating a new version.");

        return redirect()->route('superadmin.forms.index')->with('success', 'Form updated successfully! (New version created)');
    }

    public function destroy($id)
    {
        $form = Form::findOrFail($id);
        
        try {
            $this->formService->deleteForm($form);
            
            // --- AUDIT TRAIL ---
            AuditLog::logAction('Deleted', 'Forms', "Deleted form (ID: {$id}).");
            
            return to_route('superadmin.forms.index')->with('success', 'Form permanently deleted.');
        } catch (ValidationException $e) {
            return back()->with('error', $e->getMessage());
        }
    }

   public function softDelete($id)
    {
        $form = Form::findOrFail($id);
        $form->delete();

        // --- AUDIT TRAIL ---
         AuditLog::logAction('Deleted', 'Forms', "Soft-deleted archived form (ID: {$id}).");

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

    /**
     * Restore a soft-deleted or archived form.
     */
    public function restore($id)
    {
        $form = Form::withTrashed()->findOrFail($id);

        // If it was soft-deleted, restore it
        if ($form->trashed()) {
            $form->restore();
        }

        // Reset the status back to Draft so it doesn't accidentally go live immediately
        $form->update(['status' => 'Draft']);

        // --- AUDIT TRAIL ---
        AuditLog::logAction('Restored', 'Forms', "Restored form (ID: {$id}) back to Active Drafts.");

        return back()->with('success', 'Form successfully restored to Active Drafts.');
    }

    /**
     * Permanently delete a form from the system.
     */
    public function forceDelete($id)
    {
        $form = Form::withTrashed()->findOrFail($id);
        
        // Permanently remove the record from the database
        $form->forceDelete();

        // --- AUDIT TRAIL ---
        AuditLog::logAction('Deleted', 'Forms', "Permanently force-deleted form (ID: {$id}).");

        return back()->with('success', 'Form permanently deleted from the system.');
    }

    /**
     * Display the Active Deployment Kit for Focal Persons.
     */
    public function focalPersonIndex()
    {
        $activeForm = Form::getActiveFormByDepartment(auth()->user()->department_id);
        
        return inertia('FocalPerson/FocalPersonForms', [
            'deploymentData' => $activeForm ? $activeForm->getDeploymentData() : null
        ]);
    }
}