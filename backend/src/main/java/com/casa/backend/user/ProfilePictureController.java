package com.casa.backend.user;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

/**
 * REST controller for managing user profile pictures.
 * Handles uploading, retrieving, and deleting profile images using Cloudinary
 * for cloud-based image storage under /api/users.
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class ProfilePictureController {

    private final Cloudinary cloudinary;
    private final UserService userService;
    private final UserRepository userRepository;

    /**
     * Uploads a new profile picture for the authenticated user.
     * If the user already has a profile picture, the old image is deleted from
     * Cloudinary first.
     * The image is cropped to 256x256 with face detection gravity.
     *
     * @param file The image file to upload.
     * @return 200 OK with the new image URL, or 500 on upload failure.
     */
    // POST /api/users/profile-picture
    @PostMapping("/profile-picture")
    public ResponseEntity<?> uploadProfilePicture(@RequestParam("file") MultipartFile file) {
        User user = userService.getAuthenticatedUser();

        try {
            // If user already has a picture, delete the old one from Cloudinary first
            if (user.getProfileImageUrl() != null) {
                String oldPublicId = extractPublicId(user.getProfileImageUrl());
                cloudinary.uploader().destroy(oldPublicId, ObjectUtils.emptyMap());
            }

            // Upload new image
            Map uploadResult = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder", "casa/profile-pictures",
                            "public_id", "user_" + user.getId(),
                            "overwrite", true,
                            "width", 256,
                            "height", 256,
                            "crop", "fill",
                            "gravity", "face"));

            String url = (String) uploadResult.get("secure_url");
            user.setProfileImageUrl(url);
            userRepository.save(user);

            return ResponseEntity.ok(Map.of("url", url));

        } catch (IOException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to upload image"));
        }
    }

    /**
     * Deletes the authenticated user's profile picture from Cloudinary and clears it from the database.
     *
     * @return 200 OK on success, 400 Bad Request if no picture exists, or 500 on deletion failure.
     */
    // DELETE /api/users/profile-picture
    @DeleteMapping("/profile-picture")
    public ResponseEntity<?> deleteProfilePicture() {
        User user = userService.getAuthenticatedUser();

        if (user.getProfileImageUrl() == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "No profile picture to delete"));
        }

        try {
            String publicId = extractPublicId(user.getProfileImageUrl());
            cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());

            user.setProfileImageUrl(null);
            userRepository.save(user);

            return ResponseEntity.ok(Map.of("message", "Profile picture removed"));

        } catch (IOException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to delete image"));
        }
    }

    /**
     * Retrieves the profile picture URL for the authenticated user.
     *
     * @return 200 OK with the image URL, or 204 No Content if no picture is set.
     */
    // GET /api/users/profile-picture
    @GetMapping("/profile-picture")
    public ResponseEntity<?> getProfilePicture() {
        User user = userService.getAuthenticatedUser();

        if (user.getProfileImageUrl() == null) {
            return ResponseEntity.noContent().build(); // 204 — no picture set
        }

        return ResponseEntity.ok(Map.of("url", user.getProfileImageUrl()));
    }

    /**
     * Extracts the Cloudinary public ID from a full image URL.
     * Used when deleting images to identify the correct resource in Cloudinary.
     *
     * @param url The full Cloudinary image URL.
     * @return The public ID string used to reference the image in Cloudinary.
     */
    // Extracts the Cloudinary public ID from a full URL
    private String extractPublicId(String url) {
        String[] parts = url.split("/upload/");
        String afterUpload = parts[1];
        String withoutVersion = afterUpload.replaceFirst("v\\d+/", "");
        int dotIndex = withoutVersion.lastIndexOf(".");
        return dotIndex != -1 ? withoutVersion.substring(0, dotIndex) : withoutVersion;
    }
}