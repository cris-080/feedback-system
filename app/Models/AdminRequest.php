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
        'status',
        // Add any other columns your table has (e.g., 'request_type', 'description', etc.)
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
    public static function getRequestsWithAccountDetails()
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
            ->get();
    }

    /**
     * Update the status of a specific request.
     */
    public static function updateRequestStatus($id, $status)
    {
        $adminRequest = self::findOrFail($id);
        $adminRequest->update(['status' => $status]);
    }
}