package com.casa.backend.transaction;

import com.casa.backend.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Service class for managing transaction business logic.
 * Handles saving, retrieving, deleting, and importing transactions from CSV
 * files.
 * CSV date parsing supports multiple formats using a sequential formatter list.
 */
@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;

    /**
     * List of supported date formats for CSV parsing.
     * Each formatter is tried in order until one succeeds.
     * Supports: yyyy-MM-dd, MM/dd/yyyy, MM-dd-yyyy, M/d/yyyy.
     */
    private static final List<DateTimeFormatter> CSV_FORMATTERS = List.of(
            DateTimeFormatter.ofPattern("yyyy-MM-dd"),
            DateTimeFormatter.ofPattern("MM/dd/yyyy"),
            DateTimeFormatter.ofPattern("MM-dd-yyyy"),
            DateTimeFormatter.ofPattern("M/d/yyyy"));

    /**
     * Saves a single transaction to the database.
     *
     * @param transaction The transaction object to save.
     * @return The saved Transaction with its generated ID.
     */
    public Transaction saveTransaction(Transaction transaction) {
        return transactionRepository.save(transaction);
    }

    /**
     * Retrieves a transaction by its ID.
     *
     * @param id The ID of the transaction to retrieve.
     * @return The Transaction if found, or null if not found.
     */
    public Transaction getTransactionById(Long id) {
        return transactionRepository.findById(id).orElse(null);
    }

    /**
     * Deletes a transaction by its ID.
     *
     * @param id The ID of the transaction to delete.
     */
    public void deleteTransaction(Long id) {
        transactionRepository.deleteById(id);
    }

    /**
     * Deletes multiple transactions by their IDs for a specific user.
     *
     * @param ids  The list of transaction IDs to delete.
     * @param user The user who owns the transactions.
     */
    @Transactional
    public void deleteTransactionsBulk(List<Long> ids, User user) {
        transactionRepository.deleteAllByIdInAndUser(ids, user);
    }

    /**
     * Retrieves all transactions belonging to a specific user.
     *
     * @param user The authenticated user.
     * @return A list of transactions belonging to the user.
     */
    public List<Transaction> getTransactionsForUser(User user) {
        return transactionRepository.findAllByUser(user);
    }

    /**
     * Parses a CSV file and returns a preview without saving to the database.
     * Automatically detects and skips header rows containing "date".
     *
     * @param file The uploaded CSV file.
     * @return A map containing "preview" (list of parsed rows) and "errors" (list
     *         of error messages).
     */
    public Map<String, Object> previewCSV(MultipartFile file) {
        List<Map<String, String>> preview = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        try (BufferedReader br = new BufferedReader(new InputStreamReader(file.getInputStream()))) {
            String line = br.readLine();
            boolean hasHeader = line != null && line.toLowerCase().contains("date");

            if (!hasHeader && line != null) {
                parseCsvLine(line, preview, errors);
            }

            while ((line = br.readLine()) != null) {
                parseCsvLine(line, preview, errors);
            }

        } catch (Exception e) {
            throw new RuntimeException("Error processing CSV: " + e.getMessage(), e);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("preview", preview);
        result.put("errors", errors);
        return result;
    }

    /**
     * Parses a CSV file and saves all valid transactions to the database.
     * Skips duplicate transactions based on date, description, amount, category,
     * and user.
     *
     * @param file The uploaded CSV file.
     * @param user The authenticated user to associate with the transactions.
     * @return A map containing "preview" (list of saved rows) and "errors" (list of
     *         error messages).
     */
    public Map<String, Object> importCSV(MultipartFile file, User user) {
        List<Map<String, String>> preview = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        try (BufferedReader br = new BufferedReader(new InputStreamReader(file.getInputStream()))) {
            String line = br.readLine();
            boolean hasHeader = line != null && line.toLowerCase().contains("date");

            if (!hasHeader && line != null) {
                saveCsvLine(line, user, preview, errors);
            }

            while ((line = br.readLine()) != null) {
                saveCsvLine(line, user, preview, errors);
            }

        } catch (Exception e) {
            throw new RuntimeException("Error processing CSV: " + e.getMessage(), e);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("preview", preview);
        result.put("errors", errors);
        return result;
    }

    /**
     * Parses a single CSV line and adds it to the preview list without saving.
     * Tries each supported date formatter in order until one succeeds.
     *
     * @param line    The raw CSV line to parse.
     * @param preview The list to add the parsed row to.
     * @param errors  The list to add any parsing error messages to.
     */
    private void parseCsvLine(String line, List<Map<String, String>> preview, List<String> errors) {
        String[] fields = line.split(",", -1);

        if (fields.length < 4) {
            errors.add("Invalid line: " + line);
            return;
        }

        LocalDate date = null;
        for (DateTimeFormatter formatter : CSV_FORMATTERS) {
            try {
                date = LocalDate.parse(fields[0].trim(), formatter);
                break;
            } catch (Exception ignored) {
            }
        }
        if (date == null) {
            errors.add("Invalid date: " + fields[0]);
            return;
        }

        String description = fields[1].trim();
        BigDecimal amount;
        try {
            amount = new BigDecimal(fields[2].trim());
        } catch (Exception e) {
            errors.add("Invalid amount: " + fields[2]);
            return;
        }

        String category = fields[3].trim();

        Map<String, String> row = new HashMap<>();
        row.put("date", date.toString());
        row.put("description", description);
        row.put("amount", amount.toString());
        row.put("category", category);
        preview.add(row);
    }

    /**
     * Parses a single CSV line, adds it to the preview list, and saves it to the
     * database.
     * Skips saving if a duplicate transaction already exists for the user.
     *
     * @param line    The raw CSV line to parse.
     * @param user    The authenticated user to associate with the transaction.
     * @param preview The list to add the parsed row to.
     * @param errors  The list to add any parsing error messages to.
     */
    private void saveCsvLine(String line, User user, List<Map<String, String>> preview, List<String> errors) {
        String[] fields = line.split(",", -1);

        if (fields.length < 4) {
            errors.add("Invalid line: " + line);
            return;
        }

        LocalDate date = null;
        for (DateTimeFormatter formatter : CSV_FORMATTERS) {
            try {
                date = LocalDate.parse(fields[0].trim(), formatter);
                break;
            } catch (Exception ignored) {
            }
        }
        if (date == null) {
            errors.add("Invalid date: " + fields[0]);
            return;
        }

        String description = fields[1].trim();
        BigDecimal amount;
        try {
            amount = new BigDecimal(fields[2].trim());
        } catch (Exception e) {
            errors.add("Invalid amount: " + fields[2]);
            return;
        }

        String category = fields[3].trim();

        Map<String, String> row = new HashMap<>();
        row.put("date", date.toString());
        row.put("description", description);
        row.put("amount", amount.toString());
        row.put("category", category);
        preview.add(row);

        Transaction existingTx = transactionRepository.findByDateAndDescriptionAndAmountAndCategoryAndUser(date,
                description, amount, category, user);
        if (existingTx == null) {
            Transaction t = Transaction.builder()
                    .user(user)
                    .date(date)
                    .description(description)
                    .category(category)
                    .amount(amount)
                    .build();
            transactionRepository.save(t);
        }
    }
}