<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
    <div style="max-w-2xl; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #dc2626; color: white; padding: 15px 20px;">
            <h2 style="margin: 0;">URGENT: Harassment Report Submitted</h2>
        </div>
        
        <div style="padding: 20px;">
            <p><strong>Attention: Feedback Committee & Focal Person</strong></p>
            <p>A respondent has formally indicated that they experienced harassment during a transaction. Please review this immediately in the FMS Dashboard.</p>
            
            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0;"><strong>Department/Office:</strong> {{ $details['department_name'] }}</p>
                <p style="margin: 0 0 10px 0;"><strong>Transaction Date:</strong> {{ \Carbon\Carbon::parse($details['transaction_date'])->format('F j, Y') }}</p>
                <p style="margin: 0;"><strong>Provided Details/Narrative:</strong></p>
                <p style="margin: 5px 0 0 0; font-style: italic; color: #555;">"{{ $details['harassment_details'] }}"</p>
            </div>

            <p style="font-size: 12px; color: #777;">This is an automated system notification from the CLSU Feedback Management System. Do not reply to this email.</p>
        </div>
    </div>
</body>
</html>