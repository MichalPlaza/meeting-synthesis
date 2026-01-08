"""Unit tests for email service."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.services import email_service
from app.services.email_service import (
    send_email,
    send_password_reset_email,
    is_email_configured,
)


@pytest.mark.asyncio
class TestEmailService:

    # ---------------- IS_EMAIL_CONFIGURED ----------------
    def test_is_email_configured_true(self):
        """Test that is_email_configured returns True when all vars are set."""
        with patch.object(email_service, 'SMTP_USER', 'user@example.com'), \
             patch.object(email_service, 'SMTP_PASSWORD', 'password'), \
             patch.object(email_service, 'SMTP_FROM_EMAIL', 'from@example.com'):
            assert is_email_configured() is True

    def test_is_email_configured_false_missing_user(self):
        """Test that is_email_configured returns False when SMTP_USER is missing."""
        with patch.object(email_service, 'SMTP_USER', ''), \
             patch.object(email_service, 'SMTP_PASSWORD', 'password'), \
             patch.object(email_service, 'SMTP_FROM_EMAIL', 'from@example.com'):
            assert is_email_configured() is False

    def test_is_email_configured_false_missing_password(self):
        """Test that is_email_configured returns False when SMTP_PASSWORD is missing."""
        with patch.object(email_service, 'SMTP_USER', 'user@example.com'), \
             patch.object(email_service, 'SMTP_PASSWORD', ''), \
             patch.object(email_service, 'SMTP_FROM_EMAIL', 'from@example.com'):
            assert is_email_configured() is False

    def test_is_email_configured_false_missing_from_email(self):
        """Test that is_email_configured returns False when SMTP_FROM_EMAIL is missing."""
        with patch.object(email_service, 'SMTP_USER', 'user@example.com'), \
             patch.object(email_service, 'SMTP_PASSWORD', 'password'), \
             patch.object(email_service, 'SMTP_FROM_EMAIL', ''):
            assert is_email_configured() is False

    # ---------------- SEND_EMAIL ----------------
    async def test_send_email_success(self):
        """Test successful email sending."""
        with patch.object(email_service, 'SMTP_USER', 'user@example.com'), \
             patch.object(email_service, 'SMTP_PASSWORD', 'password'), \
             patch.object(email_service, 'SMTP_FROM_EMAIL', 'from@example.com'), \
             patch.object(email_service, 'SMTP_FROM_NAME', 'Test App'), \
             patch.object(email_service, 'SMTP_USE_TLS', True), \
             patch('app.services.email_service.aiosmtplib.send', new_callable=AsyncMock) as mock_send:

            result = await send_email(
                to_email="recipient@example.com",
                subject="Test Subject",
                html_body="<p>Test body</p>",
                text_body="Test body"
            )

            assert result is True
            mock_send.assert_awaited_once()

    async def test_send_email_not_configured(self):
        """Test email sending when not configured returns False."""
        with patch.object(email_service, 'SMTP_USER', ''), \
             patch.object(email_service, 'SMTP_PASSWORD', ''), \
             patch.object(email_service, 'SMTP_FROM_EMAIL', ''):

            result = await send_email(
                to_email="recipient@example.com",
                subject="Test Subject",
                html_body="<p>Test body</p>"
            )

            assert result is False

    async def test_send_email_smtp_error(self):
        """Test email sending handles SMTP errors gracefully."""
        import aiosmtplib

        with patch.object(email_service, 'SMTP_USER', 'user@example.com'), \
             patch.object(email_service, 'SMTP_PASSWORD', 'password'), \
             patch.object(email_service, 'SMTP_FROM_EMAIL', 'from@example.com'), \
             patch('app.services.email_service.aiosmtplib.send', new_callable=AsyncMock) as mock_send:

            mock_send.side_effect = aiosmtplib.SMTPException("Connection failed")

            result = await send_email(
                to_email="recipient@example.com",
                subject="Test Subject",
                html_body="<p>Test body</p>"
            )

            assert result is False

    async def test_send_email_unexpected_error(self):
        """Test email sending handles unexpected errors gracefully."""
        with patch.object(email_service, 'SMTP_USER', 'user@example.com'), \
             patch.object(email_service, 'SMTP_PASSWORD', 'password'), \
             patch.object(email_service, 'SMTP_FROM_EMAIL', 'from@example.com'), \
             patch('app.services.email_service.aiosmtplib.send', new_callable=AsyncMock) as mock_send:

            mock_send.side_effect = Exception("Unexpected error")

            result = await send_email(
                to_email="recipient@example.com",
                subject="Test Subject",
                html_body="<p>Test body</p>"
            )

            assert result is False

    # ---------------- SEND_PASSWORD_RESET_EMAIL ----------------
    async def test_send_password_reset_email_success(self):
        """Test password reset email is sent with correct content."""
        with patch.object(email_service, 'SMTP_USER', 'user@example.com'), \
             patch.object(email_service, 'SMTP_PASSWORD', 'password'), \
             patch.object(email_service, 'SMTP_FROM_EMAIL', 'from@example.com'), \
             patch.object(email_service, 'SMTP_FROM_NAME', 'Meeting Synthesis'), \
             patch.object(email_service, 'FRONTEND_URL', 'http://localhost:5173'), \
             patch('app.services.email_service.aiosmtplib.send', new_callable=AsyncMock) as mock_send:

            result = await send_password_reset_email(
                to_email="user@example.com",
                reset_token="test-token-123"
            )

            assert result is True
            mock_send.assert_awaited_once()

            # Verify the email message contains the reset link
            call_args = mock_send.call_args
            message = call_args[0][0]  # First positional argument is the message
            message_str = message.as_string()

            assert "http://localhost:5173/reset-password?token=test-token-123" in message_str
            assert "Reset Your Password" in message_str or "Password Reset" in message_str

    async def test_send_password_reset_email_failure(self):
        """Test password reset email returns False on failure."""
        with patch.object(email_service, 'SMTP_USER', ''), \
             patch.object(email_service, 'SMTP_PASSWORD', ''), \
             patch.object(email_service, 'SMTP_FROM_EMAIL', ''):

            result = await send_password_reset_email(
                to_email="user@example.com",
                reset_token="test-token-123"
            )

            assert result is False
