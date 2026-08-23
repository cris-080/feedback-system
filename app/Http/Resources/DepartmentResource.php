<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DepartmentResource extends JsonResource
{
    public function toArray(Request $request): array
{
    return [
        'department_id'   => $this->department_id,
        'department_name' => $this->department_name,
        'description'     => $this->description,
        
        // --- NEW: Allow the focal person data to pass through to React ---
        'focal_person'    => $this->whenLoaded('focalPerson', function () {
            return [
                'user_id' => $this->focalPerson->user_id,
                'email'   => $this->focalPerson->email,
            ];
        }),

        // Automatically format services if loaded
        'services'        => $this->whenLoaded('services', function () {
            return $this->services->map(function ($service) {
                return [
                    'service_id'   => $service->service_id,
                    'service_name' => $service->service_name,
                ];
            });
        }),
    ];
}
}


