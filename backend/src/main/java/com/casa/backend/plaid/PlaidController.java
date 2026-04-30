package com.casa.backend.plaid;

import com.casa.backend.user.User;
import com.casa.backend.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.security.Principal;
import java.util.List;
import java.util.Map;

/**
 * Three endpoints for the Plaid bank-link flow:
 *  POST /api/plaid/create-link-token   → returns a token the frontend uses to open Plaid Link
 *  POST /api/plaid/exchange-public-token → trades the public_token for an access_token (stored)
 *  POST /api/plaid/sync                 → pulls latest transactions from all linked banks
 *  GET  /api/plaid/items                → lists this user's linked banks (for UI)
 */
@RestController
@RequestMapping("/api/plaid")
@RequiredArgsConstructor
public class PlaidController {

    private final PlaidService plaidService;
    private final UserService userService;
    private final PlaidItemRepository plaidItemRepository;

    @PostMapping("/create-link-token")
    public ResponseEntity<?> createLinkToken(Principal principal) {
        try {
            User user = userService.getByEmail(principal.getName());
            String linkToken = plaidService.createLinkToken(user);
            return ResponseEntity.ok(Map.of("linkToken", linkToken));
        } catch (IOException e) {
            return ResponseEntity.status(502).body(Map.of("error", "Plaid request failed: " + e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Body shape from frontend:
     *   { "publicToken": "...", "institutionName": "Wells Fargo" }
     */
    @PostMapping("/exchange-public-token")
    public ResponseEntity<?> exchangePublicToken(
            @RequestBody Map<String, String> body,
            Principal principal) {
        try {
            String publicToken = body.get("publicToken");
            String institutionName = body.get("institutionName");

            if (publicToken == null || publicToken.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "publicToken is required"));
            }

            User user = userService.getByEmail(principal.getName());
            PlaidItem saved = plaidService.exchangePublicToken(user, publicToken, institutionName);

            return ResponseEntity.ok(Map.of(
                    "itemId", saved.getId(),
                    "institutionName", saved.getInstitutionName()
            ));
        } catch (IOException e) {
            return ResponseEntity.status(502).body(Map.of("error", "Plaid request failed: " + e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/sync")
    public ResponseEntity<?> sync(Principal principal) {
        try {
            User user = userService.getByEmail(principal.getName());
            Map<String, Object> summary = plaidService.syncAllItems(user);
            return ResponseEntity.ok(summary);
        } catch (IOException e) {
            return ResponseEntity.status(502).body(Map.of("error", "Plaid request failed: " + e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/items")
    public ResponseEntity<?> listItems(Principal principal) {
        User user = userService.getByEmail(principal.getName());
        List<PlaidItem> items = plaidItemRepository.findAllByUser(user);

        // Don't leak access tokens to the frontend
        List<Map<String, Object>> safe = items.stream().map(item -> Map.<String, Object>of(
                "id", item.getId(),
                "institutionName", item.getInstitutionName() != null ? item.getInstitutionName() : "Bank",
                "lastSyncedAt", item.getLastSyncedAt() != null ? item.getLastSyncedAt().toString() : ""
        )).toList();

        return ResponseEntity.ok(safe);
    }
}
