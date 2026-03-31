package com.casa.backend.user;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class ProfilePictureController {

    private final Cloudinary cloudinary;
    private final UserService userService;
    private final UserRepository userRepository;

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

    // GET /api/users/profile-picture
    @GetMapping("/profile-picture")
    public ResponseEntity<?> getProfilePicture() {
        User user = userService.getAuthenticatedUser();

        if (user.getProfileImageUrl() == null) {
            return ResponseEntity.noContent().build(); // 204 — no picture set
        }

        return ResponseEntity.ok(Map.of("url", user.getProfileImageUrl()));
    }

    // Extracts the Cloudinary public ID from a full URL
    private String extractPublicId(String url) {
        String[] parts = url.split("/upload/");
        String afterUpload = parts[1];
        String withoutVersion = afterUpload.replaceFirst("v\\d+/", "");
        int dotIndex = withoutVersion.lastIndexOf(".");
        return dotIndex != -1 ? withoutVersion.substring(0, dotIndex) : withoutVersion;
    }
}