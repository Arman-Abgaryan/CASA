package com.casa.backend.transaction;

import com.casa.backend.user.User;
import com.casa.backend.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;
    private final UserService userService;

    /**
     * Uploads a CSV file and saves transactions for the logged-in user
     */
    // PREVIEW - no saving
    @PostMapping("/upload/preview")
    public ResponseEntity<?> previewCSV(@RequestParam("file") MultipartFile file, Principal principal) {
        Map<String, Object> result = transactionService.previewCSV(file);
        return ResponseEntity.ok(result);
    }

    // CONFIRM - actually saves
    @PostMapping("/upload/confirm")
    public ResponseEntity<?> confirmCSV(@RequestParam("file") MultipartFile file, Principal principal) {
        User user = userService.getByEmail(principal.getName());
        Map<String, Object> result = transactionService.importCSV(file, user);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/add")
    public ResponseEntity<?> addTransaction(@RequestBody Transaction transaction, Principal principal) {
        User user = userService.getByEmail(principal.getName());

        transaction.setUser(user); // associate user

        transactionService.saveTransaction(transaction);

        return ResponseEntity.ok("Transaction saved successfully.");
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTransaction(@PathVariable Long id, Principal principal) {
        User user = userService.getByEmail(principal.getName());

        // Checks if the transaction belongs to the user
        Transaction tx = transactionService.getTransactionById(id);
        if (tx == null || !tx.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body("Unauthorized or not found");
        }

        transactionService.deleteTransaction(id);

        return ResponseEntity.ok("Deleted");
    }

    @DeleteMapping("/bulk")
    public ResponseEntity<?> deleteTransactionsBulk(
            @RequestBody List<Long> ids,
            Principal principal) {

        User user = userService.getByEmail(principal.getName());

        transactionService.deleteTransactionsBulk(ids, user);

        return ResponseEntity.ok("Bulk delete successful");
    }

    /**
     * Returns all transactions for the logged-in user.
     */
    @GetMapping
    public ResponseEntity<List<Transaction>> getUserTransactions(Principal principal) {

        User user = userService.getByEmail(principal.getName());

        List<Transaction> transactions = transactionService.getTransactionsForUser(user);

        return ResponseEntity.ok(transactions);
    }
}
