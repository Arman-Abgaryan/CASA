package com.casa.backend.auth;

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

/**
 * REST controller responsible for handling all authentication endpoints.
 * Manages user signup, login, and session validation under /api/auth.
 * Uses session-based Spring Security authentication.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final AuthenticationManager auth;

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
}