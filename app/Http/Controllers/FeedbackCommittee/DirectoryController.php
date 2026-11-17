<?php

namespace App\Http\Controllers\FeedbackCommittee;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Account;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class DirectoryController extends Controller
{
    /**
     * Display a view-only list of Focal Persons for the Feedback Committee.
     */
    public function index(Request $request)
    {
        $search = $request->query('search');

        $focalPersons = Account::select('account.user_id', 'account.firstname', 'account.lastname', 'account.email', 'account.status', 'department.department_name')
            ->leftJoin('department', 'account.department_id', '=', 'department.department_id')
            ->where('account.role', 'Focal Person')
            ->whereNull('account.deleted_at')
            ->when($search, function ($query, $search) {
                $like = '%' . trim($search) . '%';
                $query->where(function ($q) use ($like) {
                    $q->where('account.firstname', 'LIKE', $like)
                      ->orWhere('account.lastname', 'LIKE', $like)
                      ->orWhere('account.email', 'LIKE', $like)
                      ->orWhere('department.department_name', 'LIKE', $like)
                      ->orWhereRaw("CONCAT(account.firstname, ' ', account.lastname) LIKE ?", [$like]);
                });
            })
            ->orderBy('department.department_name', 'asc')
            ->orderBy('account.lastname', 'asc')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('FeedbackCommittee/Directory', [
            'focalPersons' => $focalPersons,
            'filters'      => ['search' => $search ?? ''],
        ]);
    }
}