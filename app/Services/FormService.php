<?php

namespace App\Services;

use App\Models\Form;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class FormService
{
    /**
     * Create a new form with all its fields and options using a Transaction[cite: 4].
     */
    public function createForm(array $data)
    {
        return DB::transaction(function () use ($data) {
            // 1. Create the Parent Form[cite: 4]
            $form = Form::create([
                'department_id' => $data['department_id'] ?? null,
                'form_group_id' => (string) Str::uuid(), 
                'form_type'     => $data['form_type'],
                'title'         => trim($data['title']),
                'description'   => trim($data['description'] ?? ''),
                'status'        => 'Draft', 
                'created_at'    => now(),
                'updated_at'    => now(),
            ]);

            // 2. Save Fields and Options[cite: 4]
            $this->saveFields($form, $data['fields']);

            return $form;
        });
    }

    /**
     * Permanently delete a form. (Requires Feedback relation check)[cite: 4]
     */
    public function deleteForm(Form $form)
    {
        // 1. Safety Check: Prevent deletion if feedback exists[cite: 4]
        $hasFeedback = \Illuminate\Support\Facades\DB::table('feedback')->where('form_id', $form->form_id)->exists();
        
        if ($hasFeedback) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'form' => 'Error: You cannot delete this form because it already has submitted feedback. Please archive it instead.' 
            ]);
        }

        // 2. Transaction for Cascading Deletion[cite: 4]
        \Illuminate\Support\Facades\DB::transaction(function () use ($form) {
            $form->fields()->each(function ($field) {
                $field->options()->delete();
                $field->delete();
            });
            $form->delete();
        });
    }

    /**
     * Publish a form and archive the previously active version[cite: 4].
     */
    /**
     * Publish a form and archive the previously active version of the SAME form type for this department.
     */
    public function publishForm(Form $form, ?int $departmentId)
    {
        DB::transaction(function () use ($form, $departmentId) {
            // Determine target department (fallback to form's assigned department if null)
            $targetDepartmentId = $departmentId ?? $form->department_id;

            // 1. Archive previous active form for this EXACT department AND form_type
            Form::where('department_id', $targetDepartmentId)
                ->where('form_type', $form->form_type) // Checks CC vs Non-CC independently
                ->where('status', 'Active')
                ->where('form_id', '!=', $form->form_id)
                ->update(['status' => 'Archived_Version']);
                
            // 2. Set the target form to Active and sync its department ID
            $form->update([
                'status'        => 'Active',
                'department_id' => $targetDepartmentId,
            ]);
        });
    }

    /**
     * Clone a form, generating a new group ID and resetting the version[cite: 4].
     */
   /**
     * Clone a form, generating a new group ID and resetting the version[cite: 23].
     */
    public function cloneForm($originalForm)
    {
        DB::transaction(function () use ($originalForm) {
            // 1. Duplicate the parent Form
            $newForm = $originalForm->replicate();
            $newForm->title = $originalForm->title . ' (Copy)';
            $newForm->status = 'Draft';
            $newForm->form_group_id = (string) \Illuminate\Support\Str::uuid();
            $newForm->version_number = 1;
            $newForm->created_at = now();
            $newForm->updated_at = now();
            $newForm->save();

            // 2. Duplicate Form Fields
            foreach ($originalForm->fields as $field) {
                $newField = $field->replicate();
                unset($newField->field_id); // Explicitly remove primary key
                $newField->form_id = $newForm->form_id;
                $newField->save();

                // 3. Duplicate Options for this field
                foreach ($field->options as $option) {
                    $newOption = $option->replicate();
                    unset($newOption->option_id); // Explicitly remove primary key
                    $newOption->field_id = $newField->field_id;
                    $newOption->save();
                }
            }
        });
    }

    /**
     * Helper to process and save fields and their options[cite: 4].
     */
/**
     * Helper to process and save fields and their options[cite: 4, 22].
     */
    private function saveFields(Form $form, array $fields)
    {
        $displayOrder = 1;

        // Fetch official services for this form's department[cite: 12]
        $departmentServices = \App\Models\DepartmentService::where('department_id', $form->department_id)
            ->pluck('service_name')
            ->toArray();

        foreach ($fields as $fieldData) {
            $fieldLabel = trim($fieldData['field_label']);
            $isLockedServiceField = (isset($fieldData['field_id']) && $fieldData['field_id'] == 7) 
                || str_contains(strtolower($fieldLabel), 'service availed');

            $field = $form->fields()->create([
                'field_label'   => $fieldLabel,
                'input_type'    => $fieldData['input_type'],
                'is_required'   => $fieldData['is_required'] ? 1 : 0,
                'step_number'   => $fieldData['step_number'],
                'display_order' => $displayOrder++,
            ]);

            // Determine option set
            if ($isLockedServiceField) {
                // Force sync with active department services
                $optionsToUse = !empty($departmentServices) ? $departmentServices : ['General Inquiry'];
            } else {
                $optionsToUse = $fieldData['options'] ?? [];
            }

            if (in_array($field->input_type, ['dropdown', 'radio', 'multiselect']) && !empty($optionsToUse)) {
                $optionsToInsert = array_map(function ($optionLabel) {
                    return ['option_label' => trim($optionLabel)];
                }, $optionsToUse);

                $field->options()->createMany($optionsToInsert);
            }
        }
    }

    /**
     * Process invisible versioning: Archive the old form and create a new version[cite: 4].
     */
    public function updateFormVersion(Form $oldForm, array $data)
    {
        return \Illuminate\Support\Facades\DB::transaction(function () use ($oldForm, $data) {
            
            // 1. CAPTURE the original status before changing anything[cite: 4]
            $originalStatus = $oldForm->status;

            // 2. FORCE the old version status to 'Archived'[cite: 4]
            $oldForm->update(['status' => 'Archived']);

            // 3. Create the NEW form version using the SAME group ID and original status[cite: 4]
            $newForm = Form::create([
                'form_group_id'  => $oldForm->form_group_id,
                'version_number' => $oldForm->version_number + 1,
                'title'          => trim($data['title']),
                'description'    => trim($data['description'] ?? ''),
                'status'         => $originalStatus, 
                'department_id'  => $data['department_id'] ?? null,
                'form_type'      => $data['form_type'],
            ]);

            // 4. Re-process and insert all customized fields using the existing helper[cite: 4]
            $this->saveFields($newForm, $data['fields']);

            return $newForm;
        });
    }

    /**
     * Archive a specific form[cite: 4].
     */
    public function archiveForm(Form $form)
    {
        $form->update(['status' => 'Archived']);
    }
}