<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class FormLinkMail extends Mailable
{
    use Queueable, SerializesModels;

    public $formLink;
    public $departmentName;

    public function __construct($formLink, $departmentName)
    {
        $this->formLink = $formLink;
        $this->departmentName = $departmentName;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Official Feedback Link for ' . $this->departmentName,
        );
    }

    public function content(): Content
    {
        // We will use a simple inline markdown template for a clean, professional look
        return new Content(
            markdown: 'emails.form-link',
        );
    }
}