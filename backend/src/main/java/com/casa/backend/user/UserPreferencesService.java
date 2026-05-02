package com.casa.backend.user;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Wrapper around UserPreferencesRepository that lazily creates a default
 * preferences row the first time a user requests theirs. This keeps the
 * rest of the app from having to null-check / handle "preferences never
 * existed" cases.
 */
@Service
@RequiredArgsConstructor
public class UserPreferencesService {

    private final UserPreferencesRepository repo;

    @Transactional
    public UserPreferences getOrCreate(User user) {
        return repo.findByUserId(user.getId()).orElseGet(() -> {
            UserPreferences fresh = UserPreferences.builder()
                    .user(user)
                    .build();
            return repo.save(fresh);
        });
    }

    public UserPreferences save(UserPreferences prefs) {
        return repo.save(prefs);
    }
}
