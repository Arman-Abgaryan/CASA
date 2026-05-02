package com.casa.backend.auth;

import com.casa.backend.email.EmailService;
import com.casa.backend.user.User;
import com.casa.backend.user.UserRepository;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

/**
 * REST controller responsible for handling all authentication endpoints.
 * Manages user signup, login, session validation, and the forgot/reset
 * password flow under /api/auth.
 * Uses session-based Spring Security authentication.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    /** How long a password reset link stays valid. */
    private static final long RESET_TOKEN_TTL_MINUTES = 30;

    /** Generic response used for /forgot-password regardless of whether
     *  the email is registered, to prevent account enumeration. */
    private static final String FORGOT_GENERIC_RESPONSE =
            "If an account exists for that email, a reset link has been sent.";

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final AuthenticationManager auth;
    private final PasswordResetTokenRepository resetTokens;
    private final EmailService emailService;
    private final com.casa.backend.user.UserPreferencesService preferencesService;

    // --------------------------- SIGNUP ---------------------------

    /**
     * Registers a new user account.
     * Checks for duplicate emails, hashes the password, and saves the user.
     *
     * @param r The signup request containing firstName, lastName, email, and password.
     * @return 200 OK on success, or 400 Bad Request if the email already exists.
     */
    @PostMapping("/signup")
    public ResponseEntity<?> signup(@Valid @RequestBody SignupRequest r) {

        if (users.findByEmail(r.email()).isPresent()) {
            return ResponseEntity.badRequest().body("Email already exists");
        }

        User newUser = new User();
        newUser.setFirstName(r.firstName());
        newUser.setLastName(r.lastName());
        newUser.setEmail(r.email());
        newUser.setPasswordHash(encoder.encode(r.password()));

        users.save(newUser);

        return ResponseEntity.ok("Signup successful");
    }

    // --------------------------- LOGIN ---------------------------

    /**
     * Authenticates a user and creates an HTTP session.
     * Stores the SecurityContext in the session so subsequent requests are
     * recognized.
     *
     * @param r The login request containing email and password.
     * @param request The HTTP request used to create and store the session.
     * @return 200 OK with AuthResponse on success, or 401 Unauthorized on failure.
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(
            @Valid @RequestBody LoginRequest r,
            HttpServletRequest request) {
        try {
            var authentication = auth.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            r.email(),
                            r.password()));

            SecurityContextHolder.getContext().setAuthentication(authentication);

            HttpSession session = request.getSession(true);
            session.setAttribute("SPRING_SECURITY_CONTEXT", SecurityContextHolder.getContext());

            User u = users.findByEmail(r.email()).orElseThrow();

            // Fire login-notification email if the user has it enabled. Best
            // effort — failures are swallowed inside EmailService so a flaky
            // mail provider can never block sign-in.
            try {
                var prefs = preferencesService.getOrCreate(u);
                if (prefs.isNotifyLogin()) {
                    String ip = extractClientIp(request);
                    String ua = request.getHeader("User-Agent");
                    emailService.sendLoginNotificationEmail(u.getEmail(), u.getFirstName(), ip, ua);
                }
            } catch (Exception logErr) {
                // Never let a notification failure break login.
            }

            return ResponseEntity.ok(
                    new AuthResponse(
                            u.getFirstName(),
                            u.getLastName(),
                            u.getEmail(),
                            u.getProfileImageUrl()));

        } catch (Exception e) {
            return ResponseEntity
                    .status(401)
                    .body("Invalid email or password");
        }
    }

    /**
     * Pulls the client's real IP from common proxy headers if present (Render
     * sits behind a load balancer that sets X-Forwarded-For), falling back to
     * the direct remote address. Just used for display in notification emails,
     * not security-sensitive.
     */
    private String extractClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            // X-Forwarded-For may be a comma-separated list — first entry is the original client.
            int comma = xff.indexOf(',');
            return (comma > 0 ? xff.substring(0, comma) : xff).trim();
        }
        String real = request.getHeader("X-Real-IP");
        if (real != null && !real.isBlank()) return real.trim();
        return request.getRemoteAddr();
    }

    // --------------------------- ME ---------------------------

    /**
     * Validates whether the current HTTP session is still authenticated.
     * Called by the frontend on startup to verify the session is still valid.
     *
     * @param request The HTTP request used to retrieve the existing session.
     * @return 200 OK with AuthResponse if valid, or 401 Unauthorized if session is missing or expired.
     */
    @GetMapping("/me")
    public ResponseEntity<?> me(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }

        var context = (org.springframework.security.core.context.SecurityContext) session
                .getAttribute("SPRING_SECURITY_CONTEXT");

        if (context == null || context.getAuthentication() == null ||
                !context.getAuthentication().isAuthenticated()) {
            return ResponseEntity.status(401).body("Not authenticated");
        }

        String email = context.getAuthentication().getName();
        User u = users.findByEmail(email).orElseThrow();

        return ResponseEntity.ok(
                new AuthResponse(
                        u.getFirstName(),
                        u.getLastName(),
                        u.getEmail(),
                        u.getProfileImageUrl()));
    }

    // --------------------------- FORGOT PASSWORD ---------------------------

    /**
     * Issues a password reset token for the given email and emails the user a
     * link containing the token. Always returns the same 200 response whether
     * or not the email is registered, to prevent attackers from probing for
     * valid accounts.
     *
     * @param r The forgot-password request containing the user's email.
     * @return 200 OK with a generic message.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest r) {
        users.findByEmail(r.email()).ifPresent(user -> {
            String token = UUID.randomUUID().toString();

            PasswordResetToken prt = PasswordResetToken.builder()
                    .token(token)
                    .userId(user.getId())
                    .expiresAt(Instant.now().plus(RESET_TOKEN_TTL_MINUTES, ChronoUnit.MINUTES))
                    .used(false)
                    .build();
            resetTokens.save(prt);

            emailService.sendPasswordResetEmail(user.getEmail(), token);
        });

        return ResponseEntity.ok(FORGOT_GENERIC_RESPONSE);
    }

    // --------------------------- RESET PASSWORD ---------------------------

    /**
     * Validates a reset token and, on success, updates the associated user's
     * password to the supplied new value. Tokens are single-use and time-limited.
     *
     * @param r The reset-password request containing the token and new password.
     * @return 200 OK on success, or 400 Bad Request if the token is missing,
     *         expired, already used, or the user has been deleted.
     */
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest r) {
        PasswordResetToken prt = resetTokens.findByToken(r.token()).orElse(null);

        if (prt == null || prt.isUsed() || prt.getExpiresAt().isBefore(Instant.now())) {
            return ResponseEntity.badRequest().body("This reset link is invalid or has expired.");
        }

        User user = users.findById(prt.getUserId()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body("This reset link is invalid or has expired.");
        }

        user.setPasswordHash(encoder.encode(r.newPassword()));
        users.save(user);

        prt.setUsed(true);
        resetTokens.save(prt);

        return ResponseEntity.ok("Your password has been reset. You can now log in with your new password.");
    }
}
