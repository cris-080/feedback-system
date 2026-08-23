<x-mail::message>
# Hello,

The official feedback evaluation form for **{{ $departmentName }}** is now active and ready to accept responses.

You can share this link directly with students and stakeholders, post it on your department's social media, or convert it into a QR code for your front desk.

<x-mail::button :url="$formLink" color="success">
View Department Feedback Form
</x-mail::button>

If you need to review your department's feedback analytics, please log in to the evaluation system using your focal person credentials.

Thank you,<br>
**University Super Admin**
</x-mail::message>