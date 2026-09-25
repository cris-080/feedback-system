<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

class Form extends Model
{
    use SoftDeletes;
    protected $table = 'forms';
    protected $primaryKey = 'form_id';
    public $timestamps = false;

    // FIX: Added 'version_number' to fillable array[cite: 10]
    protected $fillable = [
    'form_group_id',
    'version_number',
    'title',
    'description',
    'status',
    'department_id',
    'form_type',
    'header_1', 
    'header_2', 
    'header_3',
    'tagline',
    'step_1_instruction',
    'step_2_instruction',
];

    public function department()
    {
        return $this->belongsTo(Department::class, 'department_id', 'department_id');
    }

    public function fields()
    {
        return $this->hasMany(FormField::class, 'form_id', 'form_id');
    }

    // --- LOCAL SCOPES ---
    
    public function scopeActive($query)
    {
        $query->whereIn('status', ['Active', 'Draft']);
    }

    public function scopeArchived($query)
    {
        $query->whereIn('status', ['Archived', 'Archived', 'Deleted']);
    }

    public function scopeSearch($query, $search)
    {
        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('form_id', 'like', "%{$search}%");
            });
        }
    }

    public function scopeFilterDepartment($query, $departmentName)
    {
        if ($departmentName) {
            if ($departmentName === 'general') {
                $query->whereNull('department_id');
            } else {
                $query->whereHas('department', function ($q) use ($departmentName) {
                    $q->where('department_name', $departmentName);
                });
            }
        }
    }

    // ==========================================================
    // FAT MODEL METHODS (For FormController)
    // ==========================================================
public static function getPaginatedActiveForms($filters, $perPage = 10)
    {
        return self::with(['department', 'department.focalPerson'])
            ->where('status', '!=', 'Archived') // Hides archived forms from this view
            ->search($filters['search'] ?? null)
            ->filterDepartment($filters['department'] ?? null)
            ->when(!empty($filters['status']), function ($query) use ($filters) {
                // Dynamically apply Active or Draft
                $query->where('status', $filters['status']);
            })
            ->orderBy('form_id', 'desc')
            ->paginate($perPage);
    }
    public static function getPaginatedArchivedForms($filters, $perPage = 10)
    {
        return self::with('department:department_id,department_name')
            ->archived()
            ->search($filters['search'] ?? null)
            ->filterDepartment($filters['department'] ?? null)
            ->orderBy('form_id', 'desc')
            ->paginate($perPage);
    }

    public static function getArchivedUniqueDepartments()
    {
        return self::archived()
            ->whereNotNull('department_id')
            ->with('department')
            ->get()
            ->pluck('department.department_name')
            ->unique()
            ->sort()
            ->values();
    }

    public static function getFormWithFields($id)
    {
        return self::with(['fields' => function($query) {
            $query->orderBy('step_number', 'asc')->orderBy('display_order', 'asc')->with('options');
        }])->findOrFail($id);
    }

    public function getFormattedFields()
    {
        return $this->fields->map(function ($field) {
            return [
                'field_id'      => $field->field_id,
                'form_id'       => $field->form_id,
                'step_number'   => $field->step_number,
                'display_order' => $field->display_order,
                'field_label'   => $field->field_label,
                'input_type'    => $field->input_type,
                'is_required'   => $field->is_required,
                'options'       => $field->options 
                    ? $field->options->pluck('option_label')->filter()->values()->toArray() 
                    : []
            ];
        });
    }

    // ==========================================================
    // FAT MODEL METHODS (For FormBuilderController)
    // ==========================================================

    public static function getBuilderPaginatedForms($filters)
    {
        $query = self::leftJoin('department as d', 'forms.department_id', '=', 'd.department_id')
            ->select('forms.form_id', 'forms.title', 'forms.status', 'forms.department_id', 'd.department_name')
            ->whereNotIn('forms.status', ['Archived', 'Archived', 'Deleted']);

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function($q) use ($search) {
                $q->where('forms.title', 'like', "%{$search}%")
                  ->orWhere('forms.form_id', 'like', "%{$search}%")
                  ->orWhere('d.department_name', 'like', "%{$search}%");
            });
        }

        if (!empty($filters['status'])) {
            $query->where('forms.status', $filters['status']);
        }

        if (!empty($filters['department'])) {
            if ($filters['department'] === 'general') {
                $query->whereNull('forms.department_id');
            } else {
                $query->where('d.department_name', $filters['department']);
            }
        }

        return $query->orderBy('d.department_name', 'asc')
              ->orderByRaw("FIELD(forms.status, 'Active', 'Draft')")
              ->orderBy('forms.form_id', 'desc')
              ->paginate(10)
              ->withQueryString();
    }

    public static function getActiveCount()
    {
        return self::where('status', 'Active')->count();
    }

    public static function getRecentFormsWithDepartment($limit = 5)
    {
        return self::leftJoin('department', 'forms.department_id', '=', 'department.department_id')
            ->select('forms.title', 'forms.status', 'department.department_name')
            ->orderBy('forms.form_id', 'desc')
            ->limit($limit)
            ->get();
    }

    public static function getBuilderUniqueDepartments()
    {
        return self::join('department as d', 'forms.department_id', '=', 'd.department_id')
            ->select('d.department_name')
            ->whereNotIn('forms.status', ['Archived', 'Archived', 'Deleted'])
            ->distinct()
            ->orderBy('d.department_name', 'asc')
            ->pluck('department_name');
    }

    public static function storeDynamicForm(array $validated)
    {
        DB::transaction(function () use ($validated) {
            $uniqueGroupId = 'grp_' . bin2hex(random_bytes(8));

            $formId = DB::table('forms')->insertGetId([
                'form_group_id'  => $uniqueGroupId,
                'title'          => trim($validated['title']),
                'description'    => isset($validated['description']) ? trim($validated['description']) : null,
                'status'         => 'Draft',
                'department_id'  => $validated['department_id'],
                'form_type'      => $validated['form_type'] ?? 'CC',
                'version_number' => 1, // FIX: Explicitly set the initial version to 1[cite: 10]
                'created_at'     => now(),
                'updated_at'     => now(),
            ]);

            if (!empty($validated['fields'])) {
                $displayOrder = 1;

                foreach ($validated['fields'] as $field) {
                    $stepNumber = $field['step_number'] ?? 4;

                    $fieldId = DB::table('form_fields')->insertGetId([
                        'form_id'       => $formId,
                        'field_label'   => trim($field['field_label']),
                        'input_type'    => $field['input_type'],
                        'is_required'   => $field['is_required'] ?? 0,
                        'step_number'   => $stepNumber,
                        'display_order' => $displayOrder++,
                    ]);

                    if (in_array($field['input_type'], ['dropdown', 'radio', 'multiselect']) && !empty($field['options'])) {
                        $optionsToInsert = [];

                        foreach ($field['options'] as $opt) {
                            $cleanOpt = trim($opt);
                            if ($cleanOpt !== '') {
                                $optionsToInsert[] = [
                                    'field_id'     => $fieldId,
                                    'option_label' => $cleanOpt,
                                ];
                            }
                        }

                        if (!empty($optionsToInsert)) {
                            DB::table('field_options')->insert($optionsToInsert);
                        }
                    }
                }
            }
        });
    }

    /**
     * FIX: Handles Invisible Versioning[cite: 10].
     * Archives the old form and creates a new incremented version under the same form group ID.
     */
    public static function createNewFormVersion($oldFormId, array $validated)
    {
        DB::transaction(function () use ($oldFormId, $validated) {
            
            // 1. Find and archive the old form[cite: 10]
            $oldForm = self::findOrFail($oldFormId);
           $oldForm->update(['status' => 'Archived']); 

            // 2. Calculate the new version number[cite: 10]
            $currentVersion = $oldForm->version_number ?? 1;
            $newVersionNumber = $currentVersion + 1;

            // 3. Create the NEW form blueprint[cite: 10]
            $formId = DB::table('forms')->insertGetId([
                'form_group_id'  => $oldForm->form_group_id, // Inherit group ID to track history[cite: 10]
                'title'          => trim($validated['title']),
                'description'    => isset($validated['description']) ? trim($validated['description']) : null,
                'status'         => 'Active', // Make this the new active version 
                'department_id'  => $validated['department_id'],
                'form_type'      => $validated['form_type'] ?? 'CC',
                'version_number' => $newVersionNumber, 
                'created_at'     => now(),
                'updated_at'     => now(),
            ]);

            // 4. Re-attach the updated fields and options to the NEW form ID[cite: 10]
            if (!empty($validated['fields'])) {
                $displayOrder = 1;

                foreach ($validated['fields'] as $field) {
                    $stepNumber = $field['step_number'] ?? 4;

                    $fieldId = DB::table('form_fields')->insertGetId([
                        'form_id'       => $formId,
                        'field_label'   => trim($field['field_label']),
                        'input_type'    => $field['input_type'],
                        'is_required'   => $field['is_required'] ?? 0,
                        'step_number'   => $stepNumber,
                        'display_order' => $displayOrder++,
                    ]);

                    if (in_array($field['input_type'], ['dropdown', 'radio', 'multiselect']) && !empty($field['options'])) {
                        $optionsToInsert = [];

                        foreach ($field['options'] as $opt) {
                            $cleanOpt = trim($opt);
                            if ($cleanOpt !== '') {
                                $optionsToInsert[] = [
                                    'field_id'     => $fieldId,
                                    'option_label' => $cleanOpt,
                                ];
                            }
                        }

                        if (!empty($optionsToInsert)) {
                            DB::table('field_options')->insert($optionsToInsert);
                        }
                    }
                }
            }
        });
    }

    /**
     * Fetch the active form for a specific department (Used by DepartmentController).
     */
    public static function getActiveFormByDepartment($departmentId)
    {
        return self::where('department_id', $departmentId)
            ->where('status', 'Active') 
            ->first();
    }

    /**
     * Fetch the active form by its ID (Used by PublicFeedbackController).
     */
   public static function getActiveForm($id)
    {
        return self::select(
                       'form_id', 
                       'department_id', 
                       'title', 
                       'description', 
                       'form_type',
                       // THESE MUST BE INCLUDED:
                       'header_1',
                       'header_2',
                       'header_3',
                       'tagline',
                       'step_1_instruction',
                       'step_2_instruction'
                   )
                   ->where('form_id', $id)
                   ->where('status', 'Active')
                   ->first();
    }

    /**
     * Group and format form fields into ordered steps for the public feedback page.
     */
    public function getFormattedSteps()
    {
        // 1. Eager load fields with options ordered by step and display order
        $fields = $this->fields()
            ->with(['options' => function ($query) {
                $query->orderBy('option_id', 'asc');
            }])
            ->orderBy('step_number', 'asc')
            ->orderBy('display_order', 'asc')
            ->get();

        // 2. Fetch live department services for injection
        $liveServices = [];
        if ($this->department_id) {
            // Pull live services directly from the model
            $liveServices = \App\Models\DepartmentService::where('department_id', $this->department_id)
                ->pluck('service_name')
                ->toArray();
        }

        // 3. Group fields by step_number
        $grouped = $fields->groupBy('step_number');

        // 4. Format directly into step-indexed arrays
        $steps = [];
        
        // Notice we are passing $stepNumber into the closure now!
        foreach ($grouped as $stepNumber => $stepFields) {
            $steps[$stepNumber] = $stepFields->map(function ($field) use ($liveServices, $stepNumber) {
                
                $label = strtolower(trim($field->field_label));
                $isServiceField = false;
                
                // STRICT SCOPE: The "Service Availed" field only ever exists in Step 1.
                // We completely ignore Step 2 (CC), Step 3 (SQD), and Step 4 (Overall) 
                // so they never get accidentally overwritten!
                if ($stepNumber == 1) {
                    $isServiceField = (
                        (str_contains($label, 'service') && !str_contains($label, 'provider')) || 
                        str_contains($label, 'avail') || 
                        (str_contains($label, 'transaction') && !str_contains($label, 'transaction type'))
                    );
                }

                // SAFETY CHECK: Only override if the original field is a choice-based input
                $isChoiceInput = in_array($field->input_type, ['dropdown', 'radio', 'multiselect']);

                // Inject live services if all checks pass
                $options = ($isServiceField && $isChoiceInput && !empty($liveServices)) 
                    ? $liveServices 
                    : $field->options->pluck('option_label')->toArray();
                
                // Force input type to multiselect ONLY for the matching service field
                $inputType = $field->input_type;
                if ($isServiceField && $isChoiceInput && !empty($liveServices)) {
                    $inputType = 'multiselect';
                }

                return [
                    'field_id'      => $field->field_id,
                    'field_label'   => $field->field_label,
                    'input_type'    => $inputType, 
                    'is_required'   => (bool) $field->is_required,
                    'display_order' => $field->display_order,
                    'options'       => $options,
                ];
            })->values()->toArray();
        }

        return $steps;
    }
}