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

/**
 * REST controller for managing user transactions.
 * Handles adding, retrieving, deleting, and importing transactions under
 * /api/transactions.
 */
@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;
    private final UserService userService;

    /**
     * Parses a CSV file and returns a preview without saving to the database.
     *
     * @param file The uploaded CSV file.
     * @param principal The authenticated user's principal.
     * @return A map containing a preview list and any parsing errors.
     */
    // PREVIEW - no saving
    @PostMapping("/upload/preview")
    public ResponseEntity<?> previewCSV(@RequestParam("file") MultipartFile file, Principal principal) {
        Map<String, Object> result = transactionService.previewCSV(file);
        return ResponseEntity.ok(result);
    }

    /**
     * Parses a CSV file and saves all valid transactions to the database.
     * Skips duplicates based on date, description, amount, category, and user.
     *
     * @param file The uploaded CSV file.
     * @param principal The authenticated user's principal.
     * @return A map containing the saved transactions and any errors.
     */
    // CONFIRM - actually saves
    @PostMapping("/upload/confirm")
    public ResponseEntity<?> confirmCSV(@RequestParam("file") MultipartFile file, Principal principal) {
        User user = userService.getByEmail(principal.getName());
        Map<String, Object> result = transactionService.importCSV(file, user);
        return ResponseEntity.ok(result);
    }

    /**
     * Adds a single transaction for the authenticated user.
     *
     * @param transaction The transaction object to save.
     * @param principal The authenticated user's principal.
     * @return 200 OK with a success message.
     */
    @PostMapping("/add")
    public ResponseEntity<?> addTransaction(@RequestBody Transaction transaction, Principal principal) {
        User user = userService.getByEmail(principal.getName());

        transaction.setUser(user); // associate user
        // Manually-added transactions have no bank source. Label them so the UI
        // can render the Bank column consistently.
        if (transaction.getBankName() == null || transaction.getBankName().isBlank()) {
            transaction.setBankName("Manual");
        }

        transactionService.saveTransaction(transaction);

        return ResponseEntity.ok("Transaction saved successfully.");
    }

    /**
     * Deletes a single transaction by ID.
     * Only deletes if the transaction belongs to the authenticated user.
     *
     * @param id The ID of the transaction to delete.
     * @param principal The authenticated user's principal.
     * @return 200 OK on success, or 403 Forbidden if unauthorized.
     */
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

    /**
     * Deletes multiple transactions by their IDs in a single request.
     * Only deletes transactions belonging to the authenticated user.
     *
     * @param ids A list of transaction IDs to delete.
     * @param principal The authenticated user's principal.
     * @return 200 OK with a success message.
     */
    @DeleteMapping("/bulk")
    public ResponseEntity<?> deleteTransactionsBulk(
            @RequestBody List<Long> ids,
            Principal principal) {

        User user = userService.getByEmail(principal.getName());

        transactionService.deleteTransactionsBulk(ids, user);

        return ResponseEntity.ok("Bulk delete successful");
    }

    /**
     * Updates an existing transaction by ID.
     *
     * @param id The ID of the transaction to update.
     * @param updated The updated transaction data.
     * @param principal The authenticated user's principal.
     * @return The updated transaction, or 403 if unauthorized.
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateTransaction(@PathVariable Long id, @RequestBody Transaction updated,
            Principal principal) {
        User user = userService.getByEmail(principal.getName());
        Transaction result = transactionService.updateTransaction(id, updated, user);
        if (result == null) {
            return ResponseEntity.status(403).body("Unauthorized or not found");
        }
        return ResponseEntity.ok(result);
    }

    /**
     * Returns all transactions for the logged-in user.
     *
     * @param principal The authenticated user's principal.
     * @return A list of all transactions belonging to the user.
     */
    @GetMapping
    public ResponseEntity<List<Transaction>> getUserTransactions(Principal principal) {

        User user = userService.getByEmail(principal.getName());

        List<Transaction> transactions = transactionService.getTransactionsForUser(user);

        return ResponseEntity.ok(transactions);
    }
}
