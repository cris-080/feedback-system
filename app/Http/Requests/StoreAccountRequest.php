<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Use $this->user() instead of auth()->user()
        return $this->user() && $this->user()->role === 'SuperAdmin';
    }

    public function rules(): array
    {
        return [
            'firstname'     => ['required', 'string', 'max:255'],
            'lastname'      => ['required', 'string', 'max:255'],
            'username'      => ['required', 'string', 'max:255', 'unique:account,username'],
            'email'         => ['required', 'email', 'max:255', 'unique:account,email'],
            'password'      => ['required', 'string', 'min:8'],
            'role'          => ['required', 'string', 'in:Focal Person,Feedback Committee,SuperAdmin'],
            'department_id' => ['nullable', 'integer', 'exists:department,department_id'],
            'position'      => ['nullable', 'string', 'max:255'],   
        ];
    }

    // Advanced rule: Force department_id for Focal Persons
    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            if ($this->role === 'Focal Person' && empty($this->department_id)) {
                $validator->errors()->add('department_id', 'A department is required for Focal Persons.');
            }
        });
    }
}