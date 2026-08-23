<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class FormField extends Model
{
    protected $table = 'form_fields';
    protected $primaryKey = 'field_id';
    public $timestamps = false;

    protected $fillable = [
        'form_id', 
        'field_label', 
        'input_type', 
        'is_required', 
        'step_number', 
        'display_order'
    ];

    // Relationship: A field belongs to a form
    public function form()
    {
        return $this->belongsTo(Form::class, 'form_id', 'form_id');
    }

    // Relationship: A field can have many options (dropdowns, radios)
    public function options()
    {
        return $this->hasMany(FieldOption::class, 'field_id', 'field_id');
    }

    // --- FAT MODEL METHODS (For Thin Controllers) ---

    /**
     * Fetch baseline ARTA questions (ID <= 27) and format them for the React builder.
     */
   /**
     * Returns the hardcoded master blueprint for new forms.
     * This ensures every department starts with the standard mandatory questions.
     */
    public static function getBaselineFieldsFormatted()
    {
        return [
            // --- STEP 1: GENERAL TRANSACTION PROFILE ---
            [
                'field_id' => 'temp_1',
                'step_number' => 1,
                'field_label' => 'Client Type',
                'input_type' => 'radio',
                'is_required' => true,
                'options' => ['Citizen', 'Business', 'Government']
            ],

              [
                'field_id' => 'temp_2',
                'step_number' => 1,
                'field_label' => 'Transaction Type',
                'input_type' => 'radio',
                'is_required' => true,
                'options' => [
                    
                    'Internal',
                     'External'
                    
                    ]
            ],

            [
                'field_id' => 'temp_3',
                'step_number' => 1,
                'field_label' => 'Client Classification',
                'input_type' => 'radio',
                'is_required' => true,
                'options' => [
                    'Student', 
                    'Faculty Member',
                    'Non-Academic Staff'
                    
                    ]
            ],

          


            [
                'field_id' => 'temp_4',
                'step_number' => 1,
                'field_label' => 'Sex',
                'input_type' => 'radio',
                'is_required' => true,
                'options' => ['Male', 'Female',]
            ],

            [
                'field_id' => 'temp_5',
                'step_number' => 1,
                'field_label' => 'Region of Residence',
                'input_type' => 'text',
                'is_required' => true,
                'options' => []
            ],

            [
                'field_id' => 'temp_6',
                'step_number' => 1,
                'field_label' => 'Age',
                'input_type' => 'number',
                'is_required' => true,
                'options' => []
            ],
            [
                'field_id' => 'temp_7',
                'step_number' => 1,
                'field_label' => 'Service Availed',
                'input_type' => 'dropdown',
                'is_required' => true,
                'options' => ['Pending Department Sync...'] 
            ],
            [
                'field_id' => 'temp_8',
                'step_number' => 1,
                'field_label' => 'Name of Office/Department',
                'input_type' => 'text',
                'is_required' => true,
                'options' => ['General Department'] 
            ],

            [
                'field_id' => 'temp_9',
                'step_number' => 1,
                'field_label' => 'Name of Service Provider:',
                'input_type' => 'text',
                'is_required' => true,
                'options' => []
            ],



            [
                'field_id' => 'temp_10',
                'step_number' => 1,
                'field_label' => 'Position of Service Provider: ',
                'input_type' => 'text',
                'is_required' => true,
                'options' => []
            ],

            // --- STEP 2: CITIZEN'S CHARTER (CC) ---
            [
                'field_id' => 'temp_11',
                'step_number' => 2,
                'field_label' => 'CC1: Which of the following best describes your awareness of a CC?',
                'input_type' => 'radio',
                'is_required' => true,
                'options' => [
                    '1. I know what a CC is and I saw this office’s CC.',
                    '2. I know what a CC is but I did NOT see this office’s CC.',
                    '3. I learned of the CC only when I saw this office’s CC.',
                    '4. I do not know what a CC is and I did NOT see one in this office’s CC.'
                ]
            ],

            [
                'field_id' => 'temp_12',
                'step_number' => 2,
                'field_label' => 'CC2: If aware of CC (answered 1-3 in CC1), would you say that the CC on this office was…?',
                'input_type' => 'radio',
                'is_required' => true,
                'options' => [
                    '1. Easy to see',
                    '2. Somewhat easy to see',
                    '3. Difficult to see',
                    '4. Not visible at all',
                    '5. N/A']
            ],

            [
                'field_id' => 'temp_13',
                'step_number' => 2,
                'field_label' => 'CC3: If aware of CC (answered codes 1-3 in CC1), how much did the CC help you in your transaction?',
                'input_type' => 'radio',
                'is_required' => true,
                'options' => [
                    'Helped very much',
                     'Somewhat helped', 
                     'Did not help',
                     'N/A']
            ],
            
            // --- STEP 3: SERVICE QUALITY DIMENSIONS (SQD) ---
            [
                'field_id' => 'temp_14',
                'step_number' => 3,
                'field_label' => 'SQD0: I am satisfied with the service that I availed.',
                'input_type' => 'radio',
                'is_required' => true,
                'options' => ['1', '2', '3', '4', '5', 'N/A']
            ],
            [
                'field_id' => 'temp_15',
                'step_number' => 3,
                'field_label' => 'SQD1: I spent a reasonable amount of time for my transaction.',
                'input_type' => 'radio',
                'is_required' => true,
                'options' => ['1', '2', '3', '4', '5', 'N/A']
            ],

            [
                'field_id' => 'temp_16',
                'step_number' => 3,
                'field_label' => 'SQD2: The office followed the transaction’s requirement from the office or its website.',
                'input_type' => 'radio',
                'is_required' => true,
                'options' => ['1', '2', '3', '4', '5', 'N/A']
            ],  
            [
                'field_id' => 'temp_17',
                'step_number' => 3,
                'field_label' => 'SQD3: The steps (including payment) I needed to do for my transaction were easy and simple.',
                'input_type' => 'radio',
                'is_required' => true,
                'options' => ['1', '2', '3', '4', '5', 'N/A']
            ],
            [
                'field_id' => 'temp_18',
                'step_number' => 3,
                'field_label' => 'SQD4:. I easily found information about my transaction from the office or its website.',
                'input_type' => 'radio',
                'is_required' => true,
                'options' => ['1', '2', '3', '4', '5', 'N/A']
            ],
            [
                'field_id' => 'temp_19',
                'step_number' => 3,
                'field_label' => "SQD5: I paid a reasonable amount of fees for my transaction.",
                'input_type' => 'radio',
                'is_required' => true,
                'options' => ['1', '2', '3', '4', '5', 'N/A']

            ],
            [
                'field_id' => 'temp_20',
                'step_number' => 3,
                'field_label' => "SQD6: . I feel the office was fair to everyone, or “walang palakasan” during my transaction.",
                'input_type' => 'radio',
                'is_required' => true,
                'options' => ['1', '2', '3', '4', '5', 'N/A']
            ],
            [
                'field_id' => 'temp_21',
                'step_number' => 3,
                'field_label' => "SQD7: I was treated courteously by the staff, and (I asked for help) the staff was helpful.",
                'input_type' => 'radio',
                'is_required' => true,
                'options' => ['1', '2', '3', '4', '5', 'N/A']
            ],
            [
                'field_id' => 'temp_22',
                'step_number' => 3,
                'field_label' => "SQD8: I got what I needed from the government office, or (if denied) denial of request was sufficiently explained to me. ",
                'input_type' => 'radio',
                'is_required' => true,
                'options' => ['1', '2', '3', '4', '5', 'N/A']
            ],

            [
                'field_id' => 'temp_23',
                'step_number' => 3,
                'field_label' => 'Overall, how would you rate your entire educational experience at CLSU? (1 as the lowest and 5 as the highest)',
                'input_type' => 'radio',
                'is_required' => true,
                'options' => ['1 (Lowest)', '2', '3', '4', '5 (Highest)', 'N/A']
            ],

            // --- STEP 4: OVERALL EXPERIENCE ---
            
            [
                'field_id' => 'temp_24',
                'step_number' => 4,
                'field_label' => 'Have you experienced any form of harassment during the transaction in this office?',
                'input_type' => 'radio',
                'is_required' => true,
                'options' => ['Yes', 'No']
            ],
            // ADDED THIS MISSING FIELD FOR REACT TO HOOK INTO
            [
                'field_id' => 'temp_25',
                'step_number' => 4,
                'field_label' => 'If yes, please detail the harassment you experienced:',
                'input_type' => 'text',
                'is_required' => false, 
                'options' => []
            ],
            [
                'field_id' => 'temp_26',
                'step_number' => 4,
                'field_label' => 'Suggestions on how we can further improve our services:',
                'input_type' => 'text',
                'is_required' => false,
                'options' => []
            ]
        ];
    }

    
}