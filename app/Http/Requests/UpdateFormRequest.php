<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateFormRequest extends FormRequest 
{
    public function authorize(): bool
    {
        return $this->user() && in_array($this->user()->role, ['SuperAdmin', 'Feedback Committee']);
    }

    public function rules(): array
    {
        return [
            'title'                => ['required', 'string', 'max:255'],
            'description'          => ['nullable', 'string'],
            'department_id'        => ['nullable', 'integer', 'exists:department,department_id'],
            'form_type'            => ['required', 'string', 'in:CC,Non-CC'],
            
            // Validate the nested array of fields
            'fields'               => ['required', 'array', 'min:1'],
            'fields.*.field_label' => ['required', 'string', 'max:255'],
            'fields.*.input_type'  => ['required', 'string'],
            'fields.*.is_required' => ['required', 'boolean'],
            'fields.*.step_number' => ['required', 'integer', 'min:1', 'max:4'],
            
            // Validate options if the field is a dropdown/radio
            'fields.*.options'     => ['nullable', 'array'],
            'fields.*.options.*'   => ['required', 'string', 'max:255'],
        ];
    }
}