package com.casa.backend.auth;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Persisted record of a password-reset request.
 * One row per "Forgot password" submission. Tokens are single-use and expire
 * after a fixed window (see AuthController). The token column is unique so
 * lookups via findByToken are O(1).
 */
@Entity
@Table(name = "password_reset_tokens")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PasswordResetToken {

    /** Auto-generated primary key */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The opaque token string included in the reset email link. */
    @Column(unique = true, nullable = false, length = 64)
    private String token;

    /** ID of the user this token belongs to. */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** Absolute time after which the token is no longer valid. */
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    /** Once true, the token cannot be used again. */
    @Column(nullable = false)
    private boolean used;
}
