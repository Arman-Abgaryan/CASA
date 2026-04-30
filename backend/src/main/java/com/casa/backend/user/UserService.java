package com.casa.backend.user;

import lombok.RequiredArgsConstructor;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

/**
 * Service class for retrieving user information.
 * Provides methods to look up users by email and to get the currently
 * authenticated user
 * from the Spring Security context.
 */
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    /**
     * Retrieves a user by their email address.
     * Used during login and when fetching the logged-in user's data.
     *
     * @param email The email address of the user to retrieve.
     * @return The User object matching the provided email.
     * @throws RuntimeException if no user is found with the given email.
     */
    public User getByEmail(String email) {
        return userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found with email: " + email));
    }

    /**
     * Retrieves the currently authenticated user from the Spring Security context.
     * Extracts the email from the SecurityContext and looks up the corresponding
     * user.
     *
     * @return The currently authenticated User object.
     * @throws RuntimeException if the authenticated user cannot be found in the database.
     */
    public User getAuthenticatedUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();

        String email;

        if (principal instanceof UserDetails userDetails) {
            // Spring Security uses the email as the username
            email = userDetails.getUsername();
        } else {
            // Fallback in rare cases
            email = principal.toString();
        }

        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Authenticated user not found"));
    }
}
