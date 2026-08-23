<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAccountRequest extends FormRequest
{
   public function authorize(): bool
    {
        // Use $this->user() instead of auth()->user()
        return $this->user() && $this->user()->role === 'SuperAdmin';
    }

    public function rules(): array
    {
        // Get the ID from the route parameter
        $userId = $this->route('id'); 

        return [
            'firstname'     => ['required', 'string', 'max:255'],
            'lastname'      => ['required', 'string', 'max:255'],
            'username'      => ['required', 'string', 'max:255', 'unique:account,username,' . $userId . ',user_id'],
            'email'         => ['required', 'email', 'max:255', 'unique:account,email,' . $userId . ',user_id'],
            'password'      => ['nullable', 'string', 'min:8'],
            'role'          => ['required', 'string', 'in:Focal Person,Feedback Committee,SuperAdmin'],
            'department_id' => ['nullable', 'integer', 'exists:department,department_id'],
        ];
    }
}