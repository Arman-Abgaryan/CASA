package com.casa.backend.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;

import com.casa.backend.user.UserRepository;

/**
 * Establishes the Spring Security configurations for the backend.
 * This class is responsible for controlling which routes require authentication,
 * disables CSRF for development reasons, and enables CORS so the frontend
 * can successfully communicate and work with the backend.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    /**
     * Responsible for configuring the main security filter chain for the backend.
     * This involves disabling CSRF, as we're using a separate frontend, enabling CORS, and 
     * allowing unauthenticated access to authentication routes while simultaneously protecting everything
     * else.
     * 
     * @param http This is the HttpSecurity object that is used to define security rules.
     * @return The SecurityFilterChain with its defined settings.
     * @throws Exception If the filter is unable to be created.
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> {})   // CORS by CorsConfig
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/goals/**").authenticated()     
                .requestMatchers("/api/transactions/**").authenticated()
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
            )
            .securityContext(context -> context
                .securityContextRepository(new HttpSessionSecurityContextRepository())
            );
        return http.build();
    }
    
    /**
     * Provides a UserDetailsService that loads users by email for Spring Security
     * authentication.
     *
     * @param users The UserRepository used to look up users by email.
     * @return A UserDetailsService implementation that retrieves user credentials from the database.
     */
    @Bean
    public UserDetailsService userDetailsService(UserRepository users) {
        return email -> users.findByEmail(email)
                .map(user -> org.springframework.security.core.userdetails.User
                        .withUsername(user.getEmail())
                        .password(user.getPasswordHash())
                        .authorities("USER")
                        .build())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    /**
     * Provides the PasswordEncoder which is used to hash user passwords.
     * BCrypt is used, which is a standard encoder for hashing passwords.
     * 
     * @return A BCryptPasswordEncoder instance.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Provides the AuthenticationManager bean needed for manual authentication.
     * 
     * @param config The AuthenticationConfiguration
     * @return AuthenticationManager instance
     * @throws Exception if unable to get the authentication manager
     */
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}