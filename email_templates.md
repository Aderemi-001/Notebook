# Corrected Email Templates for Supabase

Please copy and paste the following HTML into your **Supabase Dashboard** under:
`Authentication` -> `Email Templates`

## 1. Confirm Signup Template
**Subject:** Confirm your signup for Notebook
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .content { padding: 40px; text-align: center; }
    .footer { padding: 30px; background-color: #111827; color: #9ca3af; text-align: center; font-size: 12px; }
    .footer a { color: #6366f1; text-decoration: none; font-weight: 600; }
    .footer a:hover { text-decoration: underline; }
    .button { display: inline-block; padding: 14px 28px; background-color: #6366f1; color: white !important; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 30px 0; }
    h1 { color: #111827; font-size: 24px; font-weight: 800; margin-bottom: 16px; }
    p { color: #4b5563; line-height: 1.6; margin-bottom: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <h1>Welcome to Notebook</h1>
      <p>Confirm your email to start your AI-powered learning journey.</p>
      <a href="{{ .ConfirmationURL }}" class="button">Confirm Email Address</a>
    </div>
    <div class="footer">
      <p>&copy; 2026 Notebook &bull; Nova V2</p>
      <p style="margin-bottom: 15px;">The smarter way to manage your knowledge.</p>
      <p>
        <a href="https://notebook-remi.vercel.app/privacy">Privacy Policy</a> &bull; 
        <a href="https://notebook-remi.vercel.app/terms">Terms of Service</a>
      </p>
    </div>
  </div>
</body>
</html>
```

## 2. Reset Password Template
**Subject:** Reset your Notebook password
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .content { padding: 40px; text-align: center; }
    .footer { padding: 30px; background-color: #111827; color: #9ca3af; text-align: center; font-size: 12px; }
    .footer a { color: #6366f1; text-decoration: none; font-weight: 600; }
    .footer a:hover { text-decoration: underline; }
    .button { display: inline-block; padding: 14px 28px; background-color: #6366f1; color: white !important; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 30px 0; }
    h1 { color: #111827; font-size: 24px; font-weight: 800; margin-bottom: 16px; }
    p { color: #4b5563; line-height: 1.6; margin-bottom: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <h1>Reset Password</h1>
      <p>We received a request to reset your password. Click the button below to choose a new one.</p>
      <a href="{{ .ConfirmationURL }}" class="button">Set New Password</a>
      <p style="font-size: 13px; color: #9ca3af;">If you didn't request this, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 Notebook &bull; Nova V2</p>
      <p style="margin-bottom: 15px;">The smarter way to manage your knowledge.</p>
      <p>
        <a href="https://notebook-remi.vercel.app/privacy">Privacy Policy</a> &bull; 
        <a href="https://notebook-remi.vercel.app/terms">Terms of Service</a>
      </p>
    </div>
  </div>
</body>
</html>
```

## 3. Magic Link Template
**Subject:** Log in to Notebook
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .content { padding: 40px; text-align: center; }
    .footer { padding: 30px; background-color: #111827; color: #9ca3af; text-align: center; font-size: 12px; }
    .footer a { color: #6366f1; text-decoration: none; font-weight: 600; }
    .footer a:hover { text-decoration: underline; }
    .button { display: inline-block; padding: 14px 28px; background-color: #6366f1; color: white !important; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 30px 0; }
    h1 { color: #111827; font-size: 24px; font-weight: 800; margin-bottom: 16px; }
    p { color: #4b5563; line-height: 1.6; margin-bottom: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <h1>Log In</h1>
      <p>Click the button below to log in to your Notebook account instantly.</p>
      <a href="{{ .ConfirmationURL }}" class="button">Log In Now</a>
    </div>
    <div class="footer">
      <p>&copy; 2026 Notebook &bull; Nova V2</p>
      <p style="margin-bottom: 15px;">The smarter way to manage your knowledge.</p>
      <p>
        <a href="https://notebook-remi.vercel.app/privacy">Privacy Policy</a> &bull; 
        <a href="https://notebook-remi.vercel.app/terms">Terms of Service</a>
      </p>
    </div>
  </div>
</body>
</html>
```
