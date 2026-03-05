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

    private final DateTimeFormatter csvFormatter =
            DateTimeFormatter.ofPattern("MM/dd/yyyy");

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

    public Map<String, Object> processCSV(MultipartFile file, User user) {
        List<Map<String, String>> preview = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        try (BufferedReader br = new BufferedReader(new InputStreamReader(file.getInputStream()))) {

            String line = br.readLine();

            // --- Determine if the first line is a header ---
            boolean hasHeader = line != null && line.toLowerCase().contains("date");

            // If no header, process first line
            if (!hasHeader && line != null) {
                processCsvLine(line, user, preview, errors);
            }

            // Process remaining lines
            while ((line = br.readLine()) != null) {
                processCsvLine(line, user, preview, errors);
            }

        } catch (Exception e) {
            throw new RuntimeException("Error processing CSV: " + e.getMessage(), e);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("preview", preview);
        result.put("errors", errors);

        return result;
    }

    private void processCsvLine(String line, User user, List<Map<String, String>> preview, List<String> errors) {
        String[] fields = line.split(",", -1);

        if (fields.length < 4) {
            errors.add("Invalid line: " + line);
            return;
        }

        LocalDate date;
        try {
            date = LocalDate.parse(fields[0].trim(), csvFormatter);
        } catch (Exception e) {
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

        // Deduplicate logic (example: based on date, description, amount, category)
        Transaction existingTx = transactionRepository.findByDateAndDescriptionAndAmountAndCategory(date, description, amount, category, user);
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
