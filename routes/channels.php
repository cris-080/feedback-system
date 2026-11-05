<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('fms-updates', function ($user) {
    // Only allow logged-in users to listen to the real-time stream
    return $user !== null;
});
