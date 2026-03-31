package com.casa.backend.auth;

/**
 * Represents the JSON response sent after a successful login.
 * Contains the user's first name, last name, and email.
 */
public record AuthResponse(
        String firstName,
        String lastName,
        String email,
        String profileImageUrl
) {}
