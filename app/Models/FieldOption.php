<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FieldOption extends Model
{
    protected $table = 'field_options';
    protected $primaryKey = 'option_id';
    public $timestamps = false;

    protected $fillable = [
        'field_id', 
        'option_label'
    ];

    // Relationship: An option belongs to a form field
    public function field()
    {
        return $this->belongsTo(FormField::class, 'field_id', 'field_id');
    }
}