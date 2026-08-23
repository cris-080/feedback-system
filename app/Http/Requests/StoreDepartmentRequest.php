<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreDepartmentRequest extends FormRequest // (or UpdateDepartmentRequest)
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->role === 'SuperAdmin';
    }

    public function rules(): array
    {
        return [
            'name'        => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ];
    }
}