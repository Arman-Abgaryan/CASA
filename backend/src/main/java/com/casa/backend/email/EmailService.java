package com.casa.backend.email;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Application email service. Sends transactional emails through Brevo's
 * HTTPS REST API.
 *
 * Why HTTPS and not SMTP: Render's free web services block all outbound
 * SMTP traffic (ports 25/465/587). Brevo's API runs on HTTPS port 443,
 * which is not blocked.
 *
 * Configured via:
 *   brevo.api-key        — API key from Brevo dashboard (Settings → API Keys)
 *   app.mail.from        — sender email (must be a verified sender in Brevo)
 *   app.mail.from-name   — display name shown in the recipient's inbox
 *   app.frontend-url     — base URL used to build links in email bodies
 */
@Service
@RequiredArgsConstructor
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final String BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

    private final ObjectMapper objectMapper;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Value("${brevo.api-key}")
    private String brevoApiKey;

    @Value("${app.mail.from}")
    private String fromEmail;

    @Value("${app.mail.from-name:CASA}")
    private String fromName;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    /**
     * Send a password reset email containing a single-use link with the
     * supplied token. Failures are logged but not rethrown — the controller
     * always returns the same generic response to avoid leaking whether an
     * email is registered (anti-enumeration).
     */
    public void sendPasswordResetEmail(String to, String token) {
        String link = frontendUrl + "/reset-password?token=" + token;
        try {
            Map<String, Object> body = Map.of(
                    "sender", Map.of("name", fromName, "email", fromEmail),
                    "to", List.of(Map.of("email", to)),
                    "subject", "Reset your CASA password",
                    "htmlContent", buildHtml(link)
            );

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(BREVO_ENDPOINT))
                    .header("api-key", brevoApiKey)
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .timeout(Duration.ofSeconds(10))
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.info("Password reset email sent to {}", to);
            } else {
                log.error("Brevo returned status {} for {}: {}", response.statusCode(), to, response.body());
            }
        } catch (Exception e) {
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
