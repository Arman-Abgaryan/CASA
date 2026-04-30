package com.casa.backend.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Request body for POST /api/auth/forgot-password.
 *
 * @param email The email address of the account requesting a reset.
 */
public record ForgotPasswordRequest(@Email @NotBlank String email) {}
