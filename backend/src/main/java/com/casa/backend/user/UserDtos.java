package com.casa.backend.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request/response DTOs used by UserController.
 *
 * Records keep these shape-only — all validation is via Jakarta annotations
 * so Spring's @Valid handling produces sensible 400s without any extra code.
 */
public final class UserDtos {

    private UserDtos() {}

    /** PATCH /api/users/me name update. */
    public record UpdateNameRequest(
            @NotBlank String firstName,
            @NotBlank String lastName) {}

    /** POST /api/users/change-email. */
    public record ChangeEmailRequest(
            @Email @NotBlank String newEmail,
            @NotBlank String currentPassword) {}

    /** POST /api/users/change-password. */
    public record ChangePasswordRequest(
            @NotBlank String currentPassword,
            @NotBlank @Size(min = 8, max = 200) String newPassword) {}

    /** PUT /api/users/preferences body. */
    public record PreferencesRequest(
            boolean notifyBudget50,
            boolean notifyBudget80,
            boolean notifyBudget100,
            boolean notifyLogin,
            boolean weeklySummary) {}

    /** What we send back for prefs reads/writes. */
    public record PreferencesResponse(
            boolean notifyBudget50,
            boolean notifyBudget80,
            boolean notifyBudget100,
            boolean notifyLogin,
            boolean weeklySummary) {

        public static PreferencesResponse from(UserPreferences p) {
            return new PreferencesResponse(
                    p.isNotifyBudget50(),
                    p.isNotifyBudget80(),
                    p.isNotifyBudget100(),
                    p.isNotifyLogin(),
                    p.isWeeklySummary());
        }
    }

    /** What GET /api/users/me returns (a bit richer than AuthResponse). */
    public record UserMeResponse(
            String firstName,
            String lastName,
            String email,
            String profileImageUrl) {

        public static UserMeResponse from(User u) {
            return new UserMeResponse(
                    u.getFirstName(),
                    u.getLastName(),
                    u.getEmail(),
                    u.getProfileImageUrl());
        }
    }
}
