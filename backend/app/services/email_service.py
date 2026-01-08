"""Email service for sending transactional emails.

Provides SMTP-based email sending for password resets and other notifications.
"""

import logging
import os
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

import aiosmtplib

logger = logging.getLogger(__name__)

# SMTP Configuration from environment
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "Meeting Synthesis")
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() == "true"

# Frontend URL for reset links
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


def is_email_configured() -> bool:
    """Check if email sending is properly configured."""
    return bool(SMTP_USER and SMTP_PASSWORD and SMTP_FROM_EMAIL)


async def send_email(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: Optional[str] = None,
) -> bool:
    """Send an email via SMTP.

    Args:
        to_email: Recipient email address.
        subject: Email subject line.
        html_body: HTML content of the email.
        text_body: Plain text fallback (optional).

    Returns:
        True if email sent successfully, False otherwise.
    """
    if not is_email_configured():
        logger.warning("Email not configured. Set SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL.")
        return False

    try:
        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
        message["To"] = to_email

        # Add plain text part (fallback)
        if text_body:
            part1 = MIMEText(text_body, "plain")
            message.attach(part1)

        # Add HTML part
        part2 = MIMEText(html_body, "html")
        message.attach(part2)

        # Send email
        if SMTP_USE_TLS:
            await aiosmtplib.send(
                message,
                hostname=SMTP_HOST,
                port=SMTP_PORT,
                username=SMTP_USER,
                password=SMTP_PASSWORD,
                start_tls=True,
            )
        else:
            await aiosmtplib.send(
                message,
                hostname=SMTP_HOST,
                port=SMTP_PORT,
                username=SMTP_USER,
                password=SMTP_PASSWORD,
            )

        logger.info(f"Email sent successfully to {to_email}")
        return True

    except aiosmtplib.SMTPException as e:
        logger.error(f"SMTP error sending email to {to_email}: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error sending email to {to_email}: {e}")
        return False


async def send_password_reset_email(to_email: str, reset_token: str) -> bool:
    """Send password reset email with reset link.

    Args:
        to_email: User's email address.
        reset_token: The password reset token.

    Returns:
        True if email sent successfully, False otherwise.
    """
    reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"

    subject = "Reset Your Password - Meeting Synthesis"

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Meeting Synthesis</h1>
    </div>

    <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>

        <p>We received a request to reset your password. Click the button below to create a new password:</p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_link}"
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                      color: white;
                      padding: 14px 30px;
                      text-decoration: none;
                      border-radius: 6px;
                      font-weight: 600;
                      display: inline-block;">
                Reset Password
            </a>
        </div>

        <p style="color: #666; font-size: 14px;">
            This link will expire in <strong>1 hour</strong> for security reasons.
        </p>

        <p style="color: #666; font-size: 14px;">
            If you didn't request this password reset, you can safely ignore this email.
            Your password will remain unchanged.
        </p>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

        <p style="color: #999; font-size: 12px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="{reset_link}" style="color: #667eea; word-break: break-all;">{reset_link}</a>
        </p>
    </div>

    <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
        <p>&copy; Meeting Synthesis. All rights reserved.</p>
    </div>
</body>
</html>
"""

    text_body = f"""
Password Reset Request - Meeting Synthesis

We received a request to reset your password.

Click this link to reset your password:
{reset_link}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, you can safely ignore this email.
Your password will remain unchanged.

---
Meeting Synthesis
"""

    return await send_email(to_email, subject, html_body, text_body)
