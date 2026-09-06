<!DOCTYPE html>
<html>
<head>
    <title>CSM Deployment Kit</title>
</head>
<body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">

    <div style="max-w: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
        <h2 style="color: #166534; border-bottom: 2px solid #eab308; padding-bottom: 10px;">Evaluation Deployment Kit</h2>
        
        <p>Hello,</p>
        <p>Here is the official Client Satisfaction Measurement (CSM) deployment kit for your specific desk/location: <strong>{{ $qrCode->label }}</strong>.</p>
        
        <h3 style="color: #1f2937; margin-top: 30px;">Desktop / Tablet Kiosk</h3>
        <p>If you are providing a device for citizens to use, please click the button below and leave the link open on your screen:</p>
        <p style="margin: 20px 0;">
            <a href="{{ route('feedback.show', ['token' => $qrCode->qr_token,'kiosk' => 'true']) }}" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Open Kiosk Form
            </a>
        </p>
        
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
        
        <h3 style="color: #1f2937;">QR-Code</h3>
        <p>If you prefer citizens to use their own smartphones, please print the QR code below and display it clearly at your desk.</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <!-- Generates the QR code on the fly and embeds it inline -->
            <img src="https://quickchart.io/qr?text={{ urlencode(route('feedback.show', ['token' => $qrCode->qr_token])) }}&size=300&margin=2" alt="Printable QR Code" style="border: 2px solid #ccc; border-radius: 8px; padding: 10px; max-width: 100%;">
        </div>
        
        <p style="font-size: 12px; color: #666; margin-top: 40px;">
            <em>Note: This QR code and link are permanently tied to your specific desk. You do not need to print a new code when the evaluation form questions are updated.</em>
        </p>
    </div>

</body>
</html>