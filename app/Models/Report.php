<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Report extends Model
{
    use HasFactory;

    protected $table = 'reports';
    protected $primaryKey = 'id';

    protected $fillable = [
        'report_name', 
        'department_id',
        'report_type',
        'start_date',
        'end_date',
        'export_format',
        'report_data',
        'generated_by'
    ];

    protected $casts = [
        'report_data' => 'array',
    ];

    public function department()
    {
        return $this->belongsTo(Department::class, 'department_id', 'department_id');
    }

 public function generator()
    {
        return $this->belongsTo(Account::class, 'generated_by', 'user_id');
    }

   /**
     * Compiles feedback data into a static JSON snapshot for reporting.
     */
    public static function generateSnapshot(array $data)
    {
        $dept = Department::find($data['department_id']);
        
        // Count respondents within the timeframe by joining the forms table to get the department_id
        $feedbacks = \App\Models\Feedback::select('feedback.response_id')
            ->join('forms', 'feedback.form_id', '=', 'forms.form_id')
            ->where('forms.department_id', $data['department_id'])
            ->whereDate('feedback.submitted_at', '>=', $data['start_date'])
            ->whereDate('feedback.submitted_at', '<=', $data['end_date'])
            ->get();

        // Return null so the controller triggers the "No feedback data found" warning
        if ($feedbacks->isEmpty()) {
            return null;
        }

        // Compile the core insertion payload
        $insertData = [
            'department_id' => $data['department_id'],
            'report_type' => $data['report_type'],
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date'],
            'export_format' => $data['export_format'] ?? 'pdf',
            'generated_by' => auth()->id(),
            'report_data' => [
                'metadata' => [
                    'department' => $dept ? $dept->department_name : 'Unknown Department',
                    'period' => date('M d, Y', strtotime($data['start_date'])) . ' to ' . date('M d, Y', strtotime($data['end_date'])),
                    'total_respondents' => $feedbacks->count(),
                ],
                // Store the raw IDs so detailed analytics can be extrapolated later if needed
                'feedbacks_logged' => $feedbacks->pluck('response_id')
            ]
        ];

        // Safely map report_name only if the physical database column exists
        if (\Illuminate\Support\Facades\Schema::hasColumn('reports', 'report_name')) {
            $insertData['report_name'] = $data['report_name'] ?? null;
        }

        // Create the new report instance
        return self::create($insertData);
    }

   /**
     * Local scope to handle Focal Person report searching.
     */
    public function scopeFilter($query, $search)
    {
        $query->when($search ?? null, function ($query, $search) {
            $like = '%' . $search . '%';
            $query->where(function ($q) use ($like) {
                if (\Illuminate\Support\Facades\Schema::hasColumn('reports', 'report_name')) {
                    $q->where('report_name', 'LIKE', $like);
                }
                $q->orWhere('report_type', 'LIKE', $like)
                  ->orWhere('start_date', 'LIKE', $like)
                  ->orWhere('end_date', 'LIKE', $like)
                  ->orWhere('status', 'LIKE', $like);
            });
        });
    }

    /**
     * Local scope to handle the complex tab filtering for the Feedback Committee.
     */
    public function scopeFilterCommittee($query, array $filters)
    {
        $tab = $filters['tab'] ?? 'submissions';

        if ($tab === 'global') {
            $query->whereNull('department_id')
                  ->whereHas('generator', function ($q) {
                      $q->where('role', 'Feedback Committee');
                  });
            $query->when($filters['report_type'] ?? null, function ($q, $type) {
                $q->where('report_type', $type);
            });
        } else {
            $query->whereNotNull('department_id')
                  ->whereIn('status', ['Submitted', 'Approved', 'Returned']);
                  
            $query->when($filters['department_id'] ?? null, function ($q, $dept) {
                $q->where('department_id', $dept);
            });
            $query->when($filters['status'] ?? null, function ($q, $status) {
                $q->where('status', $status);
            });
        }

        $query->when($filters['search'] ?? null, function ($query, $search) use ($tab) {
            $like = '%' . $search . '%';
            $query->where(function ($q) use ($like, $tab) {
                if (\Illuminate\Support\Facades\Schema::hasColumn('reports', 'report_name')) {
                    $q->where('report_name', 'LIKE', $like);
                }
                $q->orWhere('report_type', 'LIKE', $like)
                  ->orWhere('start_date', 'LIKE', $like)
                  ->orWhere('end_date', 'LIKE', $like);

                if ($tab !== 'global') {
                    $q->orWhereHas('department', function ($dq) use ($like) {
                        $dq->where('department_name', 'LIKE', $like);
                    });
                }
            });
        });
    }

    /**
     * Soft-deletes the report and updates its JSON metadata.
     */
    public function archiveReport()
    {
        $reportData = $this->report_data;
        $reportData['metadata']['is_deleted'] = true;
        $reportData['metadata']['deleted_at'] = now()->toDateTimeString();
        $this->report_data = $reportData;

        if (\Illuminate\Support\Facades\Schema::hasColumn('reports', 'deleted_at')) {
            $this->deleted_at = now();
        }

        return $this->save();
    }

    /**
     * Restores the report from the archive and cleans its JSON metadata.
     */
    public function restoreFromArchive()
    {
        $reportData = $this->report_data;
        $reportData['metadata']['is_deleted'] = false;
        unset($reportData['metadata']['deleted_at']);
        $this->report_data = $reportData;
        
        if (\Illuminate\Support\Facades\Schema::hasColumn('reports', 'deleted_at')) {
            $this->deleted_at = null;
        }

        return $this->save();
    }

    /**
     * Local scope to handle archived report filtering.
     */
    public function scopeArchivedFiltered($query, array $filters)
    {
        $query->with('department')
              ->where('report_data->metadata->is_deleted', true);

        $query->when($filters['search'] ?? null, function ($q, $search) {
            $like = '%' . trim($search) . '%';
            $q->where(function ($sq) use ($like) {
                $sq->where('report_name', 'LIKE', $like)
                  ->orWhere('report_type', 'LIKE', $like)
                  ->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(report_data, '$.metadata.deleted_at')) LIKE ?", [$like])
                  ->orWhereHas('department', function ($dq) use ($like) {
                      $dq->where('department_name', 'LIKE', $like);
                  });
            });
        });
    }

}