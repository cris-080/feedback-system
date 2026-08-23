<?php

namespace Database\Factories;

use App\Models\Account;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Account>
 */
class AccountFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Account::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'firstname'     => fake()->firstName(),
            'lastname'      => fake()->lastName(),
            'username'      => fake()->unique()->userName(),
            'email'         => fake()->unique()->safeEmail(),
            'password_hash' => Hash::make('password123'),
            'role'          => 'Focal Person',
            'department_id' => null,
            'created_at'    => now(),
            'updated_at'    => now(),
        ];
    }

    /**
     * Indicate that the user is a SuperAdmin.
     */
    public function superAdmin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'SuperAdmin',
            'department_id' => null,
        ]);
    }

    /**
     * Indicate that the user is in the Feedback Committee.
     */
    public function feedbackCommittee(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'Feedback Committee',
            'department_id' => null,
        ]);
    }
}