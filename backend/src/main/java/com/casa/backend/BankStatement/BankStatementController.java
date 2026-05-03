package com.casa.backend.BankStatement;

import com.casa.backend.user.User;
import com.casa.backend.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/api/bank-statement")
@RequiredArgsConstructor
public class BankStatementController {

    private final BankStatementService bankStatementService;
    private final UserService userService;

    @PostMapping("/preview")
    public ResponseEntity<?> preview(@RequestParam("file") MultipartFile file, Principal principal) {
        try {
            Map<String, Object> result = bankStatementService.previewStatement(file);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Failed to process bank statement: " + e.getMessage());
        }
    }

    @PostMapping("/confirm")
    public ResponseEntity<?> confirm(@RequestParam("file") MultipartFile file, Principal principal) {
        try {
            User user = userService.getByEmail(principal.getName());
            Map<String, Object> result = bankStatementService.confirmStatement(file, user);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Failed to import bank statement: " + e.getMessage());
        }
    }

    @PostMapping("/save")
    public ResponseEntity<?> save(@RequestBody List<Map<String, String>> transactions, Principal principal) {
        try {
            User user = userService.getByEmail(principal.getName());
            Map<String, Object> result = bankStatementService.saveTransactions(transactions, user);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Failed to save: " + e.getMessage());
        }
    }
}