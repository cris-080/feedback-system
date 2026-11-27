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
        'recipient',
        'target_department_id',
        'request_type',
        'priority',
        'due_date',
        'details',
        'status',
        'remarks',
        'fp_response',
        'is_notified_focal',
    ];

    // Relationship to the Account model
    public function account()
    {
        return $this->belongsTo(Account::class, 'admin_id', 'user_id');
    }

    public function targetDepartment()
    {
        return $this->belongsTo(Department::class, 'target_department_id', 'department_id');
    }

    // --- FAT MODEL METHODS (For Thin Controllers) ---

   /**
     * Fetch all requests joined with the requester's account details.
     * Keeps pending requests at the top, ordered by newest first.
     */
    public static function getRequestsWithAccountDetails($recipient = 'SuperAdmin', $perPage = 10, $search = null, $status = null)
    {
       $clearedColumn = $recipient === 'Feedback Committee'
            ? 'admin_requests.is_cleared_by_committee'
            : 'admin_requests.is_cleared_by_superadmin';

        $query = self::join('account', 'admin_requests.admin_id', '=', 'account.user_id')
            ->select(
                'admin_requests.*', 
                'account.firstname', 
                'account.lastname', 
                'account.role'
            )
            ->where('admin_requests.recipient', $recipient)
            ->where($clearedColumn, false);

        if (!empty($status)) {
            $query->where('admin_requests.status', $status);
        }

        if (!empty($search)) {
            $trimmed = trim($search);
            $like = '%' . $trimmed . '%';

            $query->where(function ($q) use ($like) {
                $q->where('admin_requests.request_id', 'LIKE', $like)
                  // Date (raw YYYY-MM-DD and formatted "Oct 3, 2026" / "October 3, 2026")
                  ->orWhere('admin_requests.created_at', 'LIKE', $like)
                  ->orWhereRaw("DATE_FORMAT(admin_requests.created_at, '%b %e, %Y') LIKE ?", [$like])
                  ->orWhereRaw("DATE_FORMAT(admin_requests.created_at, '%b %d, %Y') LIKE ?", [$like])
                  ->orWhereRaw("DATE_FORMAT(admin_requests.created_at, '%M %e, %Y') LIKE ?", [$like])
                  // Requested By (First Name, Last Name, Full Name, Role)
                  ->orWhere('account.firstname', 'LIKE', $like)
                  ->orWhere('account.lastname', 'LIKE', $like)
                  ->orWhereRaw("CONCAT(account.firstname, ' ', account.lastname) LIKE ?", [$like])
                  ->orWhere('account.role', 'LIKE', $like)
                  // Request Category, Details, Status, and Rejection Remarks
                  ->orWhere('admin_requests.request_type', 'LIKE', $like)
                  ->orWhere('admin_requests.details', 'LIKE', $like)
                  ->orWhere('admin_requests.status', 'LIKE', $like)
                  ->orWhere('admin_requests.remarks', 'LIKE', $like);
            });
        }

        return $query->orderByRaw("FIELD(admin_requests.status, 'Pending') DESC")
            ->orderBy('admin_requests.created_at', 'desc')
            ->paginate($perPage)
            ->withQueryString();
    }

    /**
     * Fetch paginated personal requests for a specific user.
     * Hides requests that the user has cleared.
     */
    public static function getPersonalRequests($userId, $perPage = 10, $search = null, $status = null, $recipient = null)
    {
        $query = self::where('admin_id', $userId)
            ->where('is_cleared_by_committee', false);

        if (!empty($recipient)) {
            $query->where('recipient', $recipient);
        }

        if (!empty($status)) {
            $query->where('status', $status);
        }

        if (!empty($search)) {
            $trimmed = trim($search);
            $like = '%' . $trimmed . '%';

            $query->where(function ($q) use ($like) {
                $q->where('request_id', 'LIKE', $like)
                  ->orWhere('created_at', 'LIKE', $like)
                  ->orWhereRaw("DATE_FORMAT(created_at, '%b %e, %Y') LIKE ?", [$like])
                  ->orWhereRaw("DATE_FORMAT(created_at, '%b %d, %Y') LIKE ?", [$like])
                  ->orWhereRaw("DATE_FORMAT(created_at, '%M %e, %Y') LIKE ?", [$like])
                  ->orWhere('recipient', 'LIKE', $like)
                  ->orWhere('request_type', 'LIKE', $like)
                  ->orWhere('details', 'LIKE', $like)
                  ->orWhere('status', 'LIKE', $like)
                  ->orWhere('remarks', 'LIKE', $like);
            });
        }

        return $query->orderBy('created_at', 'desc')
            ->paginate($perPage)
            ->withQueryString();
    }


   /**
     * Fetch Corrective Action Requests (CAR) issued by FC to Focal Persons.
     * Pass $departmentId to scope to a single Focal Person's department.
     */
    public static function getCorrectiveActions($departmentId = null, $perPage = 10, $search = null, $status = null)
    {
        $query = self::leftJoin('department', 'admin_requests.target_department_id', '=', 'department.department_id')
            ->leftJoin('account as issuer', 'admin_requests.admin_id', '=', 'issuer.user_id')
            ->select(
                'admin_requests.*',
                'department.department_name',
                'issuer.firstname as issuer_firstname',
                'issuer.lastname as issuer_lastname'
            )
            ->where('admin_requests.recipient', 'Focal Person');

        if (!empty($departmentId)) {
            $query->where('admin_requests.target_department_id', $departmentId);
        }

        if (!empty($status)) {
            $query->where('admin_requests.status', $status);
        }

        if (!empty($search)) {
            $like = '%' . trim($search) . '%';
            $query->where(function ($q) use ($like) {
                $q->where('admin_requests.request_id', 'LIKE', $like)
                  ->orWhere('department.department_name', 'LIKE', $like)
                  ->orWhere('admin_requests.request_type', 'LIKE', $like)
                  ->orWhere('admin_requests.priority', 'LIKE', $like)
                  ->orWhere('admin_requests.details', 'LIKE', $like)
                  ->orWhere('admin_requests.fp_response', 'LIKE', $like)
                  ->orWhere('admin_requests.status', 'LIKE', $like);
            });
        }

        return $query->orderByRaw("FIELD(admin_requests.status, 'Pending', 'Addressed', 'Closed') ASC")
            ->orderByRaw("FIELD(admin_requests.priority, 'Urgent', 'Normal') ASC")
            ->orderBy('admin_requests.created_at', 'desc')
            ->paginate($perPage)
            ->withQueryString();
    }

    /**
     * Mass clear all notifications based on the user's role.
     */
   public static function clearAllNotifications($role, $userId, $departmentId = null)
    {
        if (str_contains($role, 'feedback')) {
            self::where('recipient', 'Feedback Committee')
                ->where('status', 'Pending')
                ->where('is_notified_committee', false)
                ->update(['is_notified_committee' => true]);

            self::where('recipient', 'Focal Person')
                ->where('status', 'Addressed')
                ->where('is_notified_committee', false)
                ->update(['is_notified_committee' => true]);
        } elseif (str_contains($role, 'focal')) {
            self::where('recipient', 'Feedback Committee')
                ->whereIn('status', ['Approved', 'Rejected'])
                ->where('admin_id', $userId)
                ->where('is_notified_committee', false)
                ->update(['is_notified_committee' => true]);

            if ($departmentId) {
                self::where('recipient', 'Focal Person')
                    ->where('target_department_id', $departmentId)
                    ->whereIn('status', ['Pending', 'Closed'])
                    ->where('is_notified_focal', false)
                    ->update(['is_notified_focal' => true]);
            }
        }
    }
}