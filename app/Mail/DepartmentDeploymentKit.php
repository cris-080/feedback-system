<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use App\Models\QrCode;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class DepartmentDeploymentKit extends Mailable
{
    use Queueable, SerializesModels;

    public $qrCode;

    public function __construct(QrCode $qrCode)
    {
        $this->qrCode = $qrCode;
    }

    public function build()
    {
        return $this->subject('Deployment Kit: Evaluation Desk QR Code')
                    ->view('emails.deployment_kit');
    }
}
