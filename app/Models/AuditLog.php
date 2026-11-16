<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AuditLog extends Model
{
    use HasFactory;
    use SoftDeletes;

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

    /**
     * Local scope to handle all audit log filtering queries cleanly.
     */
    public function scopeFilter($query, array $filters)
    {
        $query->when($filters['search'] ?? null, function ($query, $search) {
            $like = '%' . $search . '%';
            $query->where(function($q) use ($like) {
                $q->where('action', 'LIKE', $like)
                  ->orWhere('details', 'LIKE', $like)
                  ->orWhere('module', 'LIKE', $like)
                  ->orWhereHas('account', function($accountQuery) use ($like) {
                      $accountQuery->whereRaw("CONCAT(firstname, ' ', lastname) LIKE ?", [$like])
                                   ->orWhere('email', 'LIKE', $like);
                  });
            });
        });

        $query->when($filters['role'] ?? null, function ($query, $role) {
            $query->whereHas('account', function($accountQuery) use ($role) {
                $accountQuery->where('role', $role);
            });
        });

        $query->when($filters['module'] ?? null, function ($query, $module) {
            $query->where('module', $module);
        });

        $query->when($filters['date_from'] ?? null, function ($query, $dateFrom) {
            $query->whereDate('created_at', '>=', $dateFrom);
        });

        $query->when($filters['date_to'] ?? null, function ($query, $dateTo) {
            $query->whereDate('created_at', '<=', $dateTo);
        });
    }

    /**
     * Retrieves unique modules for dropdown filters.
     */
    public static function getDistinctModules()
    {
        return self::select('module')->distinct()->orderBy('module')->pluck('module');
    }

    /**
     * Clears SuperAdmin audit logs and immediately creates a record of the action.
     */
    public static function clearAllLogs()
    {
        self::query()->delete();
        self::logAction('Deleted', 'System Administration', 'SuperAdmin cleared all system audit logs from the main dashboard.');
    }
}