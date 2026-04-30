package com.casa.backend.email;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

/**
 * Application email service. Wraps Spring's JavaMailSender so callers don't
 * need to know about MIME plumbing. Configured via spring.mail.* properties
 * (see application.properties) — currently uses Gmail SMTP.
 */
@Service
@RequiredArgsConstructor
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String from;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    /**
     * Send a password reset email containing a single-use link with the
     * supplied token. Failures are logged but not rethrown to the controller —
     * the caller responds with the same generic message regardless of whether
     * the email actually went out, to avoid leaking whether an email is
     * registered (basic anti-enumeration).
     */
    public void sendPasswordResetEmail(String to, String token) {
        String link = frontendUrl + "/reset-password?token=" + token;
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(from);
            helper.setTo(to);
            helper.setSubject("Reset your CASA password");
            helper.setText(buildHtml(link), true);
            mailSender.send(message);
            log.info("Password reset email sent to {}", to);
        } catch (MessagingException | RuntimeException e) {
            log.error("Failed to send password reset email to {}: {}", to, e.getMessage(), e);
        }
    }

    private String buildHtml(String link) {
        return """
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background-color: #f7fbfb;">
                  <div style="background-color: #ffffff; padding: 40px 32px; border-radius: 16px; box-shadow: 0 4px 24px rgba(5,46,48,0.08);">
                    <h1 style="color: #052e30; font-size: 24px; margin: 0 0 16px 0;">Reset your CASA password</h1>
                    <p style="color: #4a5556; line-height: 1.6; margin: 0 0 24px 0;">
                      We received a request to reset your password. Click the button below to choose a new one. This link will expire in 30 minutes.
                    </p>
                    <a href="%s" style="display: inline-block; background-color: #052e30; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                      Reset Password
                    </a>
                    <p style="color: #8a9293; font-size: 13px; line-height: 1.6; margin: 32px 0 0 0;">
                      If you didn't request this, you can safely ignore this email — your password won't change.
                    </p>
                    <p style="color: #8a9293; font-size: 13px; line-height: 1.6; margin: 16px 0 0 0; word-break: break-all;">
                      Or copy this link into your browser:<br/>
                      <a href="%s" style="color: #0f5a5f;">%s</a>
                    </p>
                  </div>
                </div>
                """.formatted(link, link, link);
    }
}
