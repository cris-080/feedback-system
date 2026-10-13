<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Department;
use Illuminate\Support\Facades\Log;

class RotateDailyPins extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:rotate-daily-pins';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Randomly generates a new 4-digit PIN for all departments to prevent QR spam.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $departments = Department::all();
        $count = 0;

        foreach ($departments as $department) {
            // Generate a random 4 digit number, padded with leading zeros (e.g., '0042')
            $newPin = str_pad(mt_rand(0, 9999), 4, '0', STR_PAD_LEFT);
            
            $department->update([
                'daily_pin' => $newPin
            ]);
            
            $count++;
        }

        $this->info("Successfully rotated daily PINs for {$count} departments.");
        Log::info("Daily PINs rotated successfully for {$count} departments.");
    }
}