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

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final AuthenticationManager auth;

    // --------------------------- SIGNUP ---------------------------

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