<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdminRequest extends Model
{
    // Define the exact table and primary key
    protected $table = 'admin_requests';
    protected $primaryKey = 'request_id';
    
    // Enable timestamps since your controller references created_at and updated_at
    public $timestamps = true; 

    protected $fillable = [
        'admin_id', 
        'request_type', // Added field
        'details',      // Added field
        'status',
        'remarks', 
    ];

    // Relationship to the Account model
    public function account()
    {
        return $this->belongsTo(Account::class, 'admin_id', 'user_id');
    }

    // --- FAT MODEL METHODS (For Thin Controllers) ---

    /**
     * Fetch all requests joined with the requester's account details.
     * Keeps pending requests at the top, ordered by newest first.
     */
    public static function getRequestsWithAccountDetails($perPage = 10)
    {
        return self::join('account', 'admin_requests.admin_id', '=', 'account.user_id')
            ->select(
                'admin_requests.*', 
                'account.firstname', 
                'account.lastname', 
                'account.role'
            )
            ->orderByRaw("FIELD(admin_requests.status, 'Pending') DESC") 
            ->orderBy('admin_requests.created_at', 'desc')
            ->paginate($perPage); // Swapped get() for paginate()
    }

    /**
     * Fetch paginated requests for a specific Feedback Committee member.
     */
    public static function getPersonalRequests($adminId, $perPage = 10)
    {
        return self::where('admin_id', $adminId)
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }
}