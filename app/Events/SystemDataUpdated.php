<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SystemDataUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $targetRole;
    public $departmentId;

    /**
     * @param string $targetRole 'all', 'superadmin', 'feedbackcommittee', 'focalperson'
     * @param int|null $departmentId
     */
    public function __construct($targetRole = 'all', $departmentId = null)
    {
        $this->targetRole = $targetRole;
        $this->departmentId = $departmentId;
    }

    public function broadcastOn()
    {
        // We use a single secure private channel for all system alerts
        return new PrivateChannel('fms-updates');
    }
}