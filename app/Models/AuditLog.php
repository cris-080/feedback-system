<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    use HasFactory;

    protected $primaryKey = 'log_id';
    public $timestamps = false; // We only need created_at, no updated_at for immutable logs

    protected $fillable = [
        'user_id',
        'action',
        'module',
        'details',
        'ip_address',
        'created_at'
    ];

    // Relationship to Account
    public function account()
    {
        return $this->belongsTo(Account::class, 'user_id', 'user_id');
    }

    /**
     * Helper function to quickly insert an audit log from anywhere in the app.
     * Example: AuditLog::logAction('Updated', 'Forms', 'Published form ID 47');
     */
    public static function logAction($action, $module, $details = null)
    {
        self::create([
            'user_id'    => auth()->id(),
            'action'     => $action,
            'module'     => $module,
            'details'    => $details,
            'ip_address' => request()->ip(),
            'created_at' => now(),
        ]);
    }
}