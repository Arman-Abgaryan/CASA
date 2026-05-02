package com.casa.backend.user;

import com.casa.backend.email.EmailService;
import com.casa.backend.transaction.Transaction;
import com.casa.backend.transaction.TransactionRepository;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.util.List;
import java.util.Map;

/**
 * Endpoints for managing the authenticated user's account and preferences.
 *
 * Routes (all under /api/users, all require authentication):
 *   GET    /me                  current user info (richer than /api/auth/me)
 *   PATCH  /me                  update first/last name
 *   POST   /change-email        change email (requires current password)
 *   POST   /change-password     change password (requires current password)
 *   GET    /preferences         get notification + display preferences
 *   PUT    /preferences         update preferences
 *   GET    /export              download all transactions as CSV
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository users;
    private final UserPreferencesService preferencesService;
    private final PasswordEncoder encoder;
    private final EmailService emailService;
    private final TransactionRepository transactionRepository;

    // -------------------- Helpers --------------------

    private User currentUser(Principal principal) {
        return users.findByEmail(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // -------------------- GET /me --------------------

    @GetMapping("/me")
    public ResponseEntity<?> me(Principal principal) {
        return ResponseEntity.ok(UserDtos.UserMeResponse.from(currentUser(principal)));
    }

    // -------------------- PATCH /me (update name) --------------------

    @PatchMapping("/me")
    public ResponseEntity<?> updateName(
            @Valid @RequestBody UserDtos.UpdateNameRequest req,
            Principal principal) {
        User u = currentUser(principal);
        u.setFirstName(req.firstName().trim());
        u.setLastName(req.lastName().trim());
        users.save(u);
        return ResponseEntity.ok(UserDtos.UserMeResponse.from(u));
    }

    // -------------------- POST /change-email --------------------

    @PostMapping("/change-email")
    public ResponseEntity<?> changeEmail(
            @Valid @RequestBody UserDtos.ChangeEmailRequest req,
            Principal principal) {
        User u = currentUser(principal);

        if (!encoder.matches(req.currentPassword(), u.getPasswordHash())) {
            return ResponseEntity.status(400).body(Map.of("error", "Current password is incorrect."));
        }

        String newEmail = req.newEmail().trim().toLowerCase();
        if (newEmail.equalsIgnoreCase(u.getEmail())) {
            return ResponseEntity.status(400).body(Map.of("error", "That's already your email."));
        }
        if (users.findByEmail(newEmail).isPresent()) {
            return ResponseEntity.status(400).body(Map.of("error", "That email is already in use."));
        }

        String oldEmail = u.getEmail();
        u.setEmail(newEmail);
        users.save(u);

        // The Spring Security session was tied to the OLD email, so the
        // currently-authenticated principal is now stale. Clearing forces the
        // user to sign in again with their new email — important both for
        // session integrity and so they confirm they typed the new address
        // correctly.
        SecurityContextHolder.clearContext();

        // Best-effort notification to the OLD address so they can react if
        // they didn't initiate the change.
        try {
            emailService.sendEmailChangedNotification(oldEmail, u.getFirstName(), newEmail);
        } catch (Exception ignored) {}

        return ResponseEntity.ok(Map.of(
                "message", "Email updated. Please sign in again with your new email.",
                "newEmail", newEmail
        ));
    }

    // -------------------- POST /change-password --------------------

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(
            @Valid @RequestBody UserDtos.ChangePasswordRequest req,
            Principal principal) {
        User u = currentUser(principal);

        if (!encoder.matches(req.currentPassword(), u.getPasswordHash())) {
            return ResponseEntity.status(400).body(Map.of("error", "Current password is incorrect."));
        }
        if (req.newPassword().equals(req.currentPassword())) {
            return ResponseEntity.status(400).body(Map.of("error", "New password must be different."));
        }

        u.setPasswordHash(encoder.encode(req.newPassword()));
        users.save(u);

        try {
            emailService.sendPasswordChangedNotification(u.getEmail(), u.getFirstName());
        } catch (Exception ignored) {}

        return ResponseEntity.ok(Map.of("message", "Password updated."));
    }

    // -------------------- GET /preferences --------------------

    @GetMapping("/preferences")
    public ResponseEntity<?> getPreferences(Principal principal) {
        User u = currentUser(principal);
        UserPreferences prefs = preferencesService.getOrCreate(u);
        return ResponseEntity.ok(UserDtos.PreferencesResponse.from(prefs));
    }

    // -------------------- PUT /preferences --------------------

    @PutMapping("/preferences")
    public ResponseEntity<?> updatePreferences(
            @RequestBody UserDtos.PreferencesRequest req,
            Principal principal) {
        User u = currentUser(principal);
        UserPreferences prefs = preferencesService.getOrCreate(u);

        prefs.setNotifyBudget50(req.notifyBudget50());
        prefs.setNotifyBudget80(req.notifyBudget80());
        prefs.setNotifyBudget100(req.notifyBudget100());
        prefs.setNotifyLogin(req.notifyLogin());
        prefs.setWeeklySummary(req.weeklySummary());

        UserPreferences saved = preferencesService.save(prefs);
        return ResponseEntity.ok(UserDtos.PreferencesResponse.from(saved));
    }

    // -------------------- GET /export (CSV download) --------------------

    /**
     * Streams all of the user's transactions as a CSV download. Useful for
     * users who want to leave the app, run their own analysis in Excel, or
     * keep an offline backup.
     */
    @GetMapping("/export")
    public ResponseEntity<byte[]> exportTransactions(Principal principal) {
        User u = currentUser(principal);
        List<Transaction> txs = transactionRepository.findAllByUser(u);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (PrintWriter w = new PrintWriter(new OutputStreamWriter(out, StandardCharsets.UTF_8))) {
            w.println("Date,Description,Category,Amount,Bank");
            for (Transaction t : txs) {
                w.printf("%s,%s,%s,%s,%s%n",
                        t.getDate(),
                        csv(t.getDescription()),
                        csv(t.getCategory()),
                        t.getAmount(),
                        csv(t.getBankName()));
            }
        }

        byte[] body = out.toByteArray();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"casa-transactions.csv\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(body);
    }

    /** Quote a CSV field if it contains a comma, quote, or newline. */
    private static String csv(String s) {
        if (s == null) return "";
        if (s.contains(",") || s.contains("\"") || s.contains("\n") || s.contains("\r")) {
            return "\"" + s.replace("\"", "\"\"") + "\"";
        }
        return s;
    }
}
