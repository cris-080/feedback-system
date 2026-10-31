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
}