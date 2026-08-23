<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FormResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'form_id'         => $this->form_id,
            'title'           => $this->title,
            'description'     => $this->description,
            'status'          => $this->status,
            'form_type'       => $this->form_type,
            'department_id'   => $this->department_id,
            'created_at'      => $this->created_at,
            
            // Automatically append department name if the relationship was loaded
            'department_name' => $this->whenLoaded('department', function () {
                return $this->department->department_name;
            }),
            
            'focal_person_email' => $this->whenLoaded('department', function () {
                // Check if the department has a focal person, then grab their email
                // Adjust 'email' if your account table column is named 'email_address', etc.
                return $this->department->focalPerson ? $this->department->focalPerson->email : null;
            }),


            // Automatically format fields and options if loaded
            'fields'          => $this->whenLoaded('fields', function () {
                return $this->fields->map(function ($field) {
                    return [
                        'field_id'      => $field->field_id,
                        'field_label'   => $field->field_label,
                        'input_type'    => $field->input_type,
                        'is_required'   => $field->is_required,
                        'step_number'   => $field->step_number,
                        'display_order' => $field->display_order,
                        'options'       => $field->relationLoaded('options') 
                                            ? $field->options->pluck('option_label') 
                                            : []
                    ];
                });
            }),
        ];
    }
}