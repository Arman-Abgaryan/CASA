package com.casa.backend.config;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration class for Cloudinary integration.
 * Cloudinary is used for storing and retrieving user profile images.
 * Credentials are loaded from environment variables for security.
 */
@Configuration
public class CloudinaryConfig {

    /**
     * Creates and configures the Cloudinary bean using environment variables.
     *
     * @return A configured Cloudinary instance ready for use in the application.
     */
    @Bean
    public Cloudinary cloudinary() {
        return new Cloudinary(ObjectUtils.asMap(
                "cloud_name", System.getenv("CLOUDINARY_CLOUD_NAME"),
                "api_key", System.getenv("CLOUDINARY_API_KEY"),
                "api_secret", System.getenv("CLOUDINARY_API_SECRET"),
                "secure", true));
    }
}
