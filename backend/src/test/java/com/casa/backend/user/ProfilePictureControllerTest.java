package com.casa.backend.user;

import com.cloudinary.Cloudinary;
import com.cloudinary.Uploader;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ProfilePictureControllerTest {

    @Mock
    private Cloudinary cloudinary;

    @Mock
    private Uploader uploader;

    @Mock
    private UserService userService;

    @Mock
    private UserRepository userRepository;

    private ProfilePictureController controller;

    ProfilePictureControllerTest() {
        MockitoAnnotations.openMocks(this);
        when(cloudinary.uploader()).thenReturn(uploader);
        controller = new ProfilePictureController(cloudinary, userService, userRepository);
    }

    @Test
    void uploadProfilePicture_success() throws Exception {
        User user = new User();
        user.setProfileImageUrl(null);

        MultipartFile mockFile = mock(MultipartFile.class);
        when(mockFile.getBytes()).thenReturn("image".getBytes());
        when(userService.getAuthenticatedUser()).thenReturn(user);
        when(uploader.upload(any(byte[].class), any(Map.class)))
                .thenReturn(Map.of("secure_url", "https://cloudinary.com/test.jpg"));

        ResponseEntity<?> response = controller.uploadProfilePicture(mockFile);

        assertEquals(200, response.getStatusCode().value());
        verify(userRepository, times(1)).save(user);
    }

    @Test
    void uploadProfilePicture_noExistingPicture() throws Exception {
        User user = new User();
        user.setProfileImageUrl(null);

        MultipartFile mockFile = mock(MultipartFile.class);
        when(mockFile.getBytes()).thenReturn("image".getBytes());
        when(userService.getAuthenticatedUser()).thenReturn(user);
        when(uploader.upload(any(byte[].class), any(Map.class)))
                .thenReturn(Map.of("secure_url", "https://cloudinary.com/test.jpg"));

        controller.uploadProfilePicture(mockFile);

        verify(uploader, never()).destroy(any(), any());
    }

    @Test
    void deleteProfilePicture_success() throws Exception {
        User user = new User();
        user.setProfileImageUrl("https://res.cloudinary.com/demo/image/upload/v123/casa/profile-pictures/user_1.jpg");

        when(userService.getAuthenticatedUser()).thenReturn(user);
        when(uploader.destroy(any(), any())).thenReturn(Map.of("result", "ok"));

        ResponseEntity<?> response = controller.deleteProfilePicture();

        assertEquals(200, response.getStatusCode().value());
        assertNull(user.getProfileImageUrl());
        verify(userRepository, times(1)).save(user);
    }

    @Test
    void deleteProfilePicture_noPicture() {
        User user = new User();
        user.setProfileImageUrl(null);

        when(userService.getAuthenticatedUser()).thenReturn(user);

        ResponseEntity<?> response = controller.deleteProfilePicture();

        assertEquals(400, response.getStatusCode().value());
    }

    @Test
    void getProfilePicture_exists() {
        User user = new User();
        user.setProfileImageUrl("https://cloudinary.com/test.jpg");

        when(userService.getAuthenticatedUser()).thenReturn(user);

        ResponseEntity<?> response = controller.getProfilePicture();

        assertEquals(200, response.getStatusCode().value());
    }

    @Test
    void getProfilePicture_notSet() {
        User user = new User();
        user.setProfileImageUrl(null);

        when(userService.getAuthenticatedUser()).thenReturn(user);

        ResponseEntity<?> response = controller.getProfilePicture();

        assertEquals(204, response.getStatusCode().value());
    }
}