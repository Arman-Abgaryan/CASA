package com.casa.backend.transaction;

import com.casa.backend.budget.Budget;
import com.casa.backend.budget.BudgetRepository;
import com.casa.backend.email.EmailService;
import com.casa.backend.user.User;
import com.casa.backend.user.UserPreferences;
import com.casa.backend.user.UserPreferencesService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service class for managing transaction business logic.
 * Handles saving, retrieving, deleting, and importing transactions from CSV
 * files.
 *
 * CSV import is delegated to {@link GeminiCsvParserService}. The Gemini parser
 * normalizes the rows and detects the issuing bank, so this service only has
 * to coerce a few primitive types and persist the rows.
 *
 * After every save (manual or imported) we run a lightweight budget-threshold
 * check that fires an email if the user has enabled alerts and we've crossed
 * a 50% / 80% / 100% boundary that we haven't already notified them about
 * this month.
 */
@Service
@RequiredArgsConstructor
public class TransactionService {

    private static final Logger log = LoggerFactory.getLogger(TransactionService.class);

    /** Thresholds we'll fire alerts at, in ascending order. */
    private static final int[] BUDGET_THRESHOLDS = {50, 80, 100};

    private final TransactionRepository transactionRepository;
    private final GeminiCsvParserService geminiCsvParserService;
    private final BudgetRepository budgetRepository;
    private final UserPreferencesService preferencesService;
    private final EmailService emailService;

    /**
     * Date formats accepted from Gemini's output. Gemini is asked to return
     * ISO format, but we keep a couple of fallbacks in case it deviates.
     */
    private static final List<DateTimeFormatter> DATE_FORMATTERS = List.of(
            DateTimeFormatter.ofPattern("yyyy-MM-dd"),
            DateTimeFormatter.ofPattern("MM/dd/yyyy"),
            DateTimeFormatter.ofPattern("MM-dd-yyyy"),
            DateTimeFormatter.ofPattern("M/d/yyyy"));

    public Transaction saveTransaction(Transaction transaction) {
        // Default the bank label for manually-added rows.
        if (transaction.getBankName() == null || transaction.getBankName().isBlank()) {
            transaction.setBankName("Manual");
        }
        Transaction saved = transactionRepository.save(transaction);
        // Only expense rows can push us over budget — skip the check on income.
        if (saved.getAmount() != null && saved.getAmount().signum() < 0 && saved.getUser() != null) {
            checkBudgetThresholds(saved.getUser());
        }
        return saved;
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

    public Transaction updateTransaction(Long id, Transaction updated, User user) {
        Transaction existing = transactionRepository.findById(id).orElse(null);
        if (existing == null || !existing.getUser().getId().equals(user.getId())) {
            return null;
        }
        existing.setDescription(updated.getDescription());
        existing.setCategory(updated.getCategory());
        existing.setDate(updated.getDate());
        existing.setAmount(updated.getAmount());
        // Allow the user to reassign which bank a transaction is associated with.
        // If they explicitly cleared the field, fall back to "Manual" rather than
        // wiping the column to NULL.
        if (updated.getBankName() != null) {
            String newBank = updated.getBankName().trim();
            existing.setBankName(newBank.isEmpty() ? "Manual" : newBank);
        }
        return transactionRepository.save(existing);
    }

    public List<Transaction> getTransactionsForUser(User user) {
        return transactionRepository.findAllByUser(user);
    }

    /**
     * Parses a CSV file via Gemini and returns a preview without persisting.
     */
    public Map<String, Object> previewCSV(MultipartFile file) {
        return processCsv(file, null, false);
    }

    /**
     * Parses a CSV file via Gemini and persists the new transactions for the user.
     * Skips duplicates by (date, description, amount, category, bankName, user).
     */
    public Map<String, Object> importCSV(MultipartFile file, User user) {
        return processCsv(file, user, true);
    }

    /**
     * Shared path for preview + confirm. When {@code persist} is true and a
     * user is given, valid rows are saved (skipping duplicates).
     *
     * The returned map mirrors the previous contract, plus a new "bankName" key:
     *   - "preview" : List&lt;Map&lt;String, String&gt;&gt; - one map per row
     *   - "errors"  : List&lt;String&gt; - any per-row coercion errors
     *   - "bankName": String - bank detected by Gemini
     */
    private Map<String, Object> processCsv(MultipartFile file, User user, boolean persist) {
        String csvContent = readFile(file);
        GeminiCsvParserService.ParsedCsv parsed = geminiCsvParserService.parse(csvContent);

        String bankName = parsed.bankName() != null && !parsed.bankName().isBlank()
                ? parsed.bankName()
                : "Unknown";

        List<Map<String, String>> preview = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        for (GeminiCsvParserService.ParsedRow row : parsed.rows()) {
            LocalDate date = tryParseDate(row.date());
            if (date == null) {
                errors.add("Invalid date: " + row.date());
                continue;
            }
            BigDecimal amount;
            try {
                amount = new BigDecimal(row.amount().replace(",", "").trim());
            } catch (Exception e) {
                errors.add("Invalid amount: " + row.amount());
                continue;
            }

            String description = row.description() == null ? "" : row.description().trim();
            String category = row.category() == null || row.category().isBlank()
                    ? "Other"
                    : row.category().trim();

            Map<String, String> previewRow = new HashMap<>();
            previewRow.put("date", date.toString());
            previewRow.put("description", description);
            previewRow.put("amount", amount.toString());
            previewRow.put("category", category);
            previewRow.put("bankName", bankName);
            preview.add(previewRow);

            if (persist && user != null) {
                Transaction existing = transactionRepository
                        .findByDateAndDescriptionAndAmountAndCategoryAndBankNameAndUser(
                                date, description, amount, category, bankName, user);
                if (existing == null) {
                    Transaction tx = Transaction.builder()
                            .user(user)
                            .date(date)
                            .description(description)
                            .category(category)
                            .amount(amount)
                            .bankName(bankName)
                            .build();
                    transactionRepository.save(tx);
                }
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("preview", preview);
        result.put("errors", errors);
        result.put("bankName", bankName);

        // Run the threshold check once after the whole import completes,
        // not per-row — otherwise a 50-row import could fire several emails
        // as we cross 50%, then 80%, then 100% mid-loop.
        if (persist && user != null) {
            checkBudgetThresholds(user);
        }

        return result;
    }

    /**
     * Checks whether the user's expense total for the current month has
     * crossed any newly-enabled budget alert threshold (50%, 80%, 100%) and
     * fires an email if so. Dedup logic in UserPreferences ensures we send
     * each threshold at most once per month per user.
     *
     * Best-effort: any failure is logged and swallowed so a flaky email
     * provider can never break a transaction save.
     */
    private void checkBudgetThresholds(User user) {
        try {
            List<Budget> budgets = budgetRepository.findAllByUser(user);
            BigDecimal totalBudget = budgets.stream()
                    .map(Budget::getMaxAmount)
                    .filter(java.util.Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            // Without a budget there's nothing to compare against.
            if (totalBudget.signum() <= 0) return;

            UserPreferences prefs = preferencesService.getOrCreate(user);

            // None of the thresholds enabled? Nothing to do.
            if (!prefs.isNotifyBudget50() && !prefs.isNotifyBudget80() && !prefs.isNotifyBudget100()) {
                return;
            }

            // Sum this month's expenses (negative-amount rows). Pulling all
            // the user's transactions and filtering in memory matches what
            // the rest of the app does and keeps things simple.
            LocalDate now = LocalDate.now();
            LocalDate firstOfMonth = now.withDayOfMonth(1);

            BigDecimal spent = transactionRepository.findAllByUser(user).stream()
                    .filter(t -> t.getAmount() != null && t.getAmount().signum() < 0)
                    .filter(t -> t.getDate() != null
                            && !t.getDate().isBefore(firstOfMonth)
                            && t.getDate().getMonth() == now.getMonth()
                            && t.getDate().getYear() == now.getYear())
                    .map(t -> t.getAmount().abs())
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            int percent = spent.multiply(BigDecimal.valueOf(100))
                    .divide(totalBudget, 0, RoundingMode.DOWN)
                    .intValue();

            // Reset the dedup tracker if we've rolled into a new month.
            if (prefs.getLastBudgetAlertMonth() == null ||
                    !prefs.getLastBudgetAlertMonth().equals(firstOfMonth)) {
                prefs.setLastBudgetAlertMonth(firstOfMonth);
                prefs.setLastBudgetAlertLevel(0);
            }

            // Find the highest threshold we've crossed, that's enabled, and
            // that we haven't already sent for this month. Send only that one
            // (no point sending 50% AND 80% in one go).
            int sendLevel = 0;
            for (int t : BUDGET_THRESHOLDS) {
                if (percent >= t && t > prefs.getLastBudgetAlertLevel() && enabledFor(prefs, t)) {
                    sendLevel = t;
                }
            }

            if (sendLevel > 0) {
                emailService.sendBudgetThresholdEmail(
                        user.getEmail(), user.getFirstName(), sendLevel, spent, totalBudget);
                prefs.setLastBudgetAlertLevel(sendLevel);
                preferencesService.save(prefs);
            }
        } catch (Exception e) {
            log.warn("Budget threshold check failed for user {}: {}", user.getEmail(), e.getMessage());
        }
    }

    private boolean enabledFor(UserPreferences p, int threshold) {
        return switch (threshold) {
            case 50 -> p.isNotifyBudget50();
            case 80 -> p.isNotifyBudget80();
            case 100 -> p.isNotifyBudget100();
            default -> false;
        };
    }

    /**
     * Reads the entire uploaded file into a single UTF-8 string. Bank CSVs are
     * tiny by LLM standards (typically a few KB to a few hundred KB), so
     * loading the whole file into memory is fine.
     */
    private String readFile(MultipartFile file) {
        try (BufferedReader br = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            return br.lines().collect(Collectors.joining("\n"));
        } catch (Exception e) {
            throw new RuntimeException("Error processing CSV: " + e.getMessage(), e);
        }
    }

    private LocalDate tryParseDate(String raw) {
        if (raw == null) return null;
        String trimmed = raw.trim();
        if (trimmed.isEmpty()) return null;
        for (DateTimeFormatter f : DATE_FORMATTERS) {
            try {
                return LocalDate.parse(trimmed, f);
            } catch (Exception ignored) {
            }
        }
        return null;
    }
}
