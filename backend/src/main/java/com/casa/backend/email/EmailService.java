package com.casa.backend.email;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Application email service. Sends transactional emails through Brevo's
 * HTTPS REST API.
 *
 * Configured via:
 *   brevo.api-key        — API key from Brevo dashboard (Settings → API Keys)
 *   app.mail.from        — sender email (must be a verified sender in Brevo)
 *   app.mail.from-name   — display name shown in the recipient's inbox
 *   app.frontend-url     — base URL used to build links in email bodies
 *
 * All sender methods are best-effort: failures are logged and swallowed so
 * a flaky email provider can never block a user-facing action (login,
 * password change, transaction save, etc.).
 */
@Service
@RequiredArgsConstructor
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final String BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

    /** Shared brand colours used across all the email templates. */
    private static final String BRAND_DARK = "#052e30";
    private static final String BRAND_LIGHT = "#0f5a5f";
    private static final String BACKGROUND = "#f7fbfb";

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

    // ============================ PUBLIC API ============================

    /**
     * Send a password reset email containing a single-use link.
     */
    public void sendPasswordResetEmail(String to, String token) {
        String link = frontendUrl + "/reset-password?token=" + token;
        send(to, "Reset your CASA password", buildResetHtml(link));
    }

    /**
     * Notify the user that someone signed into their account. Includes the IP,
     * approximate location (best-effort, just IP for now) and user agent so
     * the user can spot suspicious access.
     */
    public void sendLoginNotificationEmail(String to, String firstName, String ip, String userAgent) {
        send(to, "New sign-in to your CASA account",
                buildLoginNotificationHtml(firstName, ip, userAgent));
    }

    /**
     * Notify the user that their budget is at a given threshold (50/80/100%).
     * The dedup logic that prevents repeat alerts in the same month lives in
     * the caller (TransactionService) — this method just sends.
     */
    public void sendBudgetThresholdEmail(String to, String firstName, int thresholdPercent,
                                         BigDecimal spent, BigDecimal budget) {
        String subject;
        if (thresholdPercent >= 100) subject = "You've exceeded your monthly budget";
        else if (thresholdPercent >= 80) subject = "Heads up — you're at " + thresholdPercent + "% of your budget";
        else subject = "Spending update — you've used " + thresholdPercent + "% of your budget";

        send(to, subject, buildBudgetAlertHtml(firstName, thresholdPercent, spent, budget));
    }

    /**
     * Notify the user (at the OLD address) that their account email was changed.
     * Gives them a chance to react if it wasn't them.
     */
    public void sendEmailChangedNotification(String oldAddress, String firstName, String newAddress) {
        send(oldAddress, "Your CASA email address was changed",
                buildEmailChangedHtml(firstName, newAddress));
    }

    /**
     * Notify the user that their account password was changed.
     */
    public void sendPasswordChangedNotification(String to, String firstName) {
        send(to, "Your CASA password was changed",
                buildPasswordChangedHtml(firstName));
    }

    // ============================ TRANSPORT ============================

    /**
     * Single shared transport. Handles JSON serialization, the HTTP call,
     * and best-effort error handling. Returns silently on any failure.
     */
    private void send(String to, String subject, String htmlContent) {
        try {
            Map<String, Object> body = Map.of(
                    "sender", Map.of("name", fromName, "email", fromEmail),
                    "to", List.of(Map.of("email", to)),
                    "subject", subject,
                    "htmlContent", htmlContent
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
                log.info("Email '{}' sent to {}", subject, to);
            } else {
                log.error("Brevo returned {} for {} ('{}'): {}",
                        response.statusCode(), to, subject, response.body());
            }
        } catch (Exception e) {
            log.error("Failed to send '{}' to {}: {}", subject, to, e.getMessage(), e);
        }
    }

    // ============================ TEMPLATES ============================

    private String envelope(String inner) {
        return """
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background-color: %s;">
                  <div style="background-color: #ffffff; padding: 40px 32px; border-radius: 16px; box-shadow: 0 4px 24px rgba(5,46,48,0.08);">
                    %s
                  </div>
                </div>
                """.formatted(BACKGROUND, inner);
    }

    private String buildResetHtml(String link) {
        return envelope("""
                <h1 style="color: %s; font-size: 24px; margin: 0 0 16px 0;">Reset your CASA password</h1>
                <p style="color: #4a5556; line-height: 1.6; margin: 0 0 24px 0;">
                  We received a request to reset your password. Click the button below to choose a new one. This link will expire in 30 minutes.
                </p>
                <a href="%s" style="display: inline-block; background-color: %s; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                  Reset Password
                </a>
                <p style="color: #8a9293; font-size: 13px; line-height: 1.6; margin: 32px 0 0 0;">
                  If you didn't request this, you can safely ignore this email — your password won't change.
                </p>
                <p style="color: #8a9293; font-size: 13px; line-height: 1.6; margin: 16px 0 0 0; word-break: break-all;">
                  Or copy this link into your browser:<br/>
                  <a href="%s" style="color: %s;">%s</a>
                </p>
                """.formatted(BRAND_DARK, link, BRAND_DARK, link, BRAND_LIGHT, link));
    }

    private String buildLoginNotificationHtml(String firstName, String ip, String userAgent) {
        String when = DateTimeFormatter.ofPattern("MMM d, yyyy 'at' h:mm a z", Locale.US)
                .withZone(ZoneId.of("UTC"))
                .format(Instant.now());
        String safeUA = userAgent == null ? "Unknown device" : escape(userAgent);
        String safeIP = ip == null ? "unknown" : escape(ip);
        return envelope("""
                <h1 style="color: %s; font-size: 22px; margin: 0 0 16px 0;">New sign-in to your account</h1>
                <p style="color: #4a5556; line-height: 1.6; margin: 0 0 16px 0;">Hi %s,</p>
                <p style="color: #4a5556; line-height: 1.6; margin: 0 0 16px 0;">
                  Someone just signed into your CASA account. Here are the details:
                </p>
                <table style="width: 100%%; margin: 16px 0; font-size: 14px;">
                  <tr><td style="color: #8a9293; padding: 4px 0;">When</td><td style="color: #052e30; padding: 4px 0;">%s</td></tr>
                  <tr><td style="color: #8a9293; padding: 4px 0;">IP address</td><td style="color: #052e30; padding: 4px 0;">%s</td></tr>
                  <tr><td style="color: #8a9293; padding: 4px 0; vertical-align: top;">Device</td><td style="color: #052e30; padding: 4px 0; word-break: break-all;">%s</td></tr>
                </table>
                <p style="color: #4a5556; line-height: 1.6; margin: 16px 0 0 0;">
                  If this was you, you can safely ignore this email. If not, please change your password right away.
                </p>
                <p style="color: #8a9293; font-size: 13px; margin: 24px 0 0 0;">
                  You can turn these notifications off any time from <a href="%s/settings" style="color: %s;">Settings → Notifications</a>.
                </p>
                """.formatted(BRAND_DARK, escape(firstName), when, safeIP, safeUA, frontendUrl, BRAND_LIGHT));
    }

    private String buildBudgetAlertHtml(String firstName, int percent, BigDecimal spent, BigDecimal budget) {
        String spentFmt = "$" + spent.setScale(2, RoundingMode.HALF_UP);
        String budgetFmt = "$" + budget.setScale(2, RoundingMode.HALF_UP);

        String headline;
        String color;
        if (percent >= 100) {
            headline = "You've exceeded your monthly budget";
            color = "#d32f2f";
        } else if (percent >= 80) {
            headline = "You're close to exceeding your budget";
            color = "#ef6c00";
        } else {
            headline = "Spending update";
            color = "#ed6c02";
        }

        return envelope("""
                <h1 style="color: %s; font-size: 22px; margin: 0 0 16px 0;">%s</h1>
                <p style="color: #4a5556; line-height: 1.6; margin: 0 0 16px 0;">Hi %s,</p>
                <p style="color: #4a5556; line-height: 1.6; margin: 0 0 16px 0;">
                  Your monthly spending has reached <strong style="color: %s;">%d%%</strong> of your total budget.
                </p>
                <table style="width: 100%%; margin: 16px 0; font-size: 14px;">
                  <tr><td style="color: #8a9293; padding: 4px 0;">Spent this month</td><td style="color: #052e30; padding: 4px 0; text-align: right;">%s</td></tr>
                  <tr><td style="color: #8a9293; padding: 4px 0;">Budget limit</td><td style="color: #052e30; padding: 4px 0; text-align: right;">%s</td></tr>
                </table>
                <a href="%s/budgets" style="display: inline-block; background-color: %s; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 8px;">
                  Review your budget
                </a>
                <p style="color: #8a9293; font-size: 13px; margin: 24px 0 0 0;">
                  You can adjust which thresholds notify you any time from <a href="%s/settings" style="color: %s;">Settings → Notifications</a>.
                </p>
                """.formatted(color, headline, escape(firstName), color, percent,
                        spentFmt, budgetFmt, frontendUrl, BRAND_DARK, frontendUrl, BRAND_LIGHT));
    }

    private String buildEmailChangedHtml(String firstName, String newAddress) {
        return envelope("""
                <h1 style="color: %s; font-size: 22px; margin: 0 0 16px 0;">Your email address was changed</h1>
                <p style="color: #4a5556; line-height: 1.6; margin: 0 0 16px 0;">Hi %s,</p>
                <p style="color: #4a5556; line-height: 1.6; margin: 0 0 16px 0;">
                  The email address on your CASA account was just changed to <strong>%s</strong>.
                  All future notifications and communications will go to that address.
                </p>
                <p style="color: #4a5556; line-height: 1.6; margin: 0 0 16px 0;">
                  If this wasn't you, please contact us immediately and reset your password.
                </p>
                """.formatted(BRAND_DARK, escape(firstName), escape(newAddress)));
    }

    private String buildPasswordChangedHtml(String firstName) {
        String when = DateTimeFormatter.ofPattern("MMM d, yyyy 'at' h:mm a z", Locale.US)
                .withZone(ZoneId.of("UTC"))
                .format(Instant.now());
        return envelope("""
                <h1 style="color: %s; font-size: 22px; margin: 0 0 16px 0;">Your password was changed</h1>
                <p style="color: #4a5556; line-height: 1.6; margin: 0 0 16px 0;">Hi %s,</p>
                <p style="color: #4a5556; line-height: 1.6; margin: 0 0 16px 0;">
                  Your CASA account password was changed on %s.
                </p>
                <p style="color: #4a5556; line-height: 1.6; margin: 0 0 16px 0;">
                  If this wasn't you, please reset your password immediately and review your recent
                  account activity.
                </p>
                """.formatted(BRAND_DARK, escape(firstName), when));
    }

    /** Minimal HTML escape — enough for the user-supplied fields we interpolate. */
    private static String escape(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
