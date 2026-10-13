<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
    <h2 style="color: #009639;">Welcome to CLSU FMS!</h2>
    <p>Hello <strong>{{ $user->firstname }}</strong>,</p>
    <p>An administrator has created an account for you with the role of <strong>{{ $user->role }}</strong>.</p>
    <p>Here are your login credentials:</p>
    
    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
        <p style="margin: 0 0 10px 0;"><strong>Username:</strong> {{ $user->username }}</p>
        <p style="margin: 0 0 10px 0;"><strong>Email:</strong> {{ $user->email }}</p>
        <p style="margin: 0;"><strong>Temporary Password:</strong> <span style="font-family: monospace; background: #fff; padding: 2px 6px; border-radius: 4px; border: 1px solid #ccc;">{{ $temporaryPassword }}</span></p>
    </div>

    <p>Please log in using the button below. We highly recommend changing this temporary password in your Profile Settings immediately after your first login.</p>
    <br>
    <a href="{{ $loginUrl }}" style="padding: 12px 20px; background-color: #009639; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Go to Login Page</a>
</div>