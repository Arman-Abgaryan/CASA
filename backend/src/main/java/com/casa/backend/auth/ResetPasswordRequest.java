package com.casa.backend.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for POST /api/auth/reset-password.
 *
 * @param token The reset token issued by /forgot-password and emailed to the user.
 * @param newPassword The new plaintext password (will be bcrypt-hashed before storage).
 */
public record ResetPasswordRequest(
        @NotBlank String token,
        @NotBlank @Size(min = 6, message = "Password must be at least 6 characters") String newPassword
) {}
