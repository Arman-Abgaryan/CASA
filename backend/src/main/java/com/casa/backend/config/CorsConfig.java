package com.casa.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Responsible for configuring CORS (Cross-Origin Resource Sharing) settings for the backend.
 * Allowed origins are read from the APP_CORS_ALLOWED_ORIGINS env var (comma-separated)
 * so the same code works in dev (localhost) and production (Netlify domain).
 */
@Configuration
public class CorsConfig {

    @Value("${app.cors.allowed-origins:http://localhost:5173}")
    private String[] allowedOrigins;

    /**
     * Sets up the CORS rules so the frontend can send HTTP requests
     * to the backend without it being blocked.
     *
     * @return A WebMvcConfigurer that has the CORS configuration and rules
     */
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**")
                        .allowedOrigins(allowedOrigins)
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                        .allowedHeaders("*")
                        .allowCredentials(true);
            }
        };
    }
}
