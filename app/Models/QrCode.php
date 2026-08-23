<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QrCode extends Model
{
    protected $table = 'qr_code';
    protected $primaryKey = 'qr_id';
    
    // Disable default timestamps if your table doesn't have updated_at
    public $timestamps = false; 

    protected $fillable = [
        'qr_token', 
        'label', 
        'is_active', 
        'created_at', 
        'expires_at', 
        'department_id'
    ];
}