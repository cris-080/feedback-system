<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AccountResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->user_id,
            'firstname'       => $this->firstname,
            'lastname'        => $this->lastname,
            'username'        => $this->username,
            'email'           => $this->email,
            'role'            => $this->role,
            'department_id'   => $this->department_id,
            // Only append the department name if the relationship was loaded in the controller
            'department_name' => $this->whenLoaded('department', function () {
                return $this->department->department_name;
            }),
        ];
    }
}