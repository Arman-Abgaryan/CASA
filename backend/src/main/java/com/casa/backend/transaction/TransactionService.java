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

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;

    private static final List<DateTimeFormatter> CSV_FORMATTERS = List.of(
            DateTimeFormatter.ofPattern("yyyy-MM-dd"),
            DateTimeFormatter.ofPattern("MM/dd/yyyy"),
            DateTimeFormatter.ofPattern("MM-dd-yyyy"),
            DateTimeFormatter.ofPattern("M/d/yyyy"));

    public Transaction saveTransaction(Transaction transaction) {
        return transactionRepository.save(transaction);
    }

    public Transaction getTransactionById(Long id) {
        return transactionRepository.findById(id).orElse(null);
    }

    public void deleteTransaction(Long id) {
        transactionRepository.deleteById(id);
    }

    @Transactional
    public void deleteTransactionsBulk(List<Long> ids, User user) {
        transactionRepository.deleteAllByIdInAndUser(ids, user);
    }

    public List<Transaction> getTransactionsForUser(User user) {
        return transactionRepository.findAllByUser(user);
    }

    // PREVIEW ONLY - no saving
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

    // SAVE - called on confirm
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

    // Parses a line without saving
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

    // Parses a line and saves it
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