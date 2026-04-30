package com.casa.backend.AI;

import com.casa.backend.user.User;
import com.casa.backend.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AIController {

    private final AIService aiService;
    private final UserService userService;

    /**
     * Sends a message to Benjamin (AI advisor) and returns a response.
     *
     * @param request The user's message.
     * @param principal The authenticated user's principal.
     * @return Benjamin's response.
     */
    @PostMapping("/chat")
    public ResponseEntity<?> chat(@RequestBody AIRequest request, Principal principal) {
        User user = userService.getByEmail(principal.getName());
        String response = aiService.chat(request.getMessage(), user);
        return ResponseEntity.ok(Map.of("response", response));
    }
}
