package com.casa.backend.auth;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * Repository for {@link PasswordResetToken}. Standard CRUD plus a lookup
 * by token string used to validate incoming reset-password requests.
 */
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    /**
     * Look up a token by its opaque string value.
     *
     * @param token the token from the reset link.
     * @return Optional containing the row if it exists.
     */
    Optional<PasswordResetToken> findByToken(String token);
}
