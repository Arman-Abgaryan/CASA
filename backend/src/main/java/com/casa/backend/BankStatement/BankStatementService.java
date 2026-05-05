package com.casa.backend.BankStatement;

import com.casa.backend.transaction.Transaction;
import com.casa.backend.transaction.TransactionRepository;
import com.casa.backend.user.User;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

/**
 * AI-driven bank-statement (PDF) parser.
 *
 * Sends an uploaded PDF to Anthropic's Claude API, asks it to extract every
 * transaction in a strict JSON shape, then maps the result into our
 * {@link Transaction} entity.
 *
 * NOTE on bank attribution: this importer doesn't currently try to detect
 * the issuing bank from the statement. We tag every imported row with
 * "Statement Upload" so the UI's "Bank" column has something meaningful
 * and our duplicate-detection key (which includes bankName) is consistent
 * across re-uploads of the same statement.
 */
@Service
@RequiredArgsConstructor
public class BankStatementService {

    /** Bank label used for every transaction imported via PDF upload. */
    private static final String SOURCE_BANK_NAME = "Statement Upload";

    @Value("${anthropic.api.key}")
    private String apiKey;

    private final TransactionRepository transactionRepository;

    public Map<String, Object> previewStatement(MultipartFile file) throws Exception {
        String base64 = Base64.getEncoder().encodeToString(file.getBytes());
        String extractedText = callClaude(base64);
        List<Map<String, String>> preview = parseTransactions(extractedText);
        List<String> errors = new ArrayList<>();
        Map<String, Object> result = new HashMap<>();
        result.put("preview", preview);
        result.put("errors", errors);
        return result;
    }

    public Map<String, Object> confirmStatement(MultipartFile file, User user) throws Exception {
        String base64 = Base64.getEncoder().encodeToString(file.getBytes());
        String extractedText = callClaude(base64);
        List<Map<String, String>> preview = parseTransactions(extractedText);
        return saveTransactions(preview, user);
    }

    /**
     * Persists pre-parsed transaction rows for the given user. Skips
     * duplicates by (date, description, amount, category, bankName, user) —
     * the same key the CSV importer uses, so re-importing the same statement
     * is idempotent.
     */
    public Map<String, Object> saveTransactions(List<Map<String, String>> rows, User user) {
        List<String> errors = new ArrayList<>();
        int saved = 0;

        for (Map<String, String> row : rows) {
            try {
                LocalDate date = LocalDate.parse(row.get("date"));
                String description = row.get("description");
                BigDecimal amount = new BigDecimal(row.get("amount"));
                String category = row.getOrDefault("category", "Other");
                if (category == null || category.isBlank()) category = "Other";

                Transaction existing = transactionRepository
                        .findByDateAndDescriptionAndAmountAndCategoryAndBankNameAndUser(
                                date, description, amount, category, SOURCE_BANK_NAME, user);

                if (existing == null) {
                    Transaction t = Transaction.builder()
                            .user(user)
                            .date(date)
                            .description(description)
                            .category(category)
                            .amount(amount)
                            .bankName(SOURCE_BANK_NAME)
                            .build();
                    transactionRepository.save(t);
                    saved++;
                }
            } catch (Exception e) {
                errors.add("Failed to save: " + row.get("description"));
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("saved", saved);
        result.put("errors", errors);
        return result;
    }

    /**
     * Sends the base64-encoded PDF and a strict JSON-output prompt to
     * Claude and returns the raw text portion of the response.
     */
    private String callClaude(String base64Pdf) throws Exception {
        String prompt = """
                Extract all transactions from this bank statement.
                Return ONLY a JSON array with no other text, in this exact format:
                [
                  {"date": "YYYY-MM-DD", "description": "merchant name", "amount": -12.50, "category": "Food"},
                  ...
                ]
                Rules:
                - Use negative amounts for expenses/debits, positive for income/credits
                - Date must be in YYYY-MM-DD format
                - Category must be one of: Food, Transport, Bills, Shopping, Health, Entertainment, Paycheck, Vacation, Other
                - Keep description concise
                - Skip balance rows, headers, and summaries
                """;

        String body = String.format("""
                {
                    "model": "claude-haiku-4-5-20251001",
                    "max_tokens": 4096,
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "document",
                                    "source": {
                                        "type": "base64",
                                        "media_type": "application/pdf",
                                        "data": "%s"
                                    }
                                },
                                {
                                    "type": "text",
                                    "text": "%s"
                                }
                            ]
                        }
                    ]
                }
                """, base64Pdf, prompt.replace("\n", "\\n").replace("\"", "\\\""));

        java.net.http.HttpClient client = java.net.http.HttpClient.newHttpClient();
        java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
                .uri(java.net.URI.create("https://api.anthropic.com/v1/messages"))
                .header("Content-Type", "application/json")
                .header("x-api-key", apiKey)
                .header("anthropic-version", "2023-06-01")
                .header("anthropic-beta", "pdfs-2024-09-25")
                .POST(java.net.http.HttpRequest.BodyPublishers.ofString(body))
                .build();

        java.net.http.HttpResponse<String> response = client.send(request,
                java.net.http.HttpResponse.BodyHandlers.ofString());
        ObjectMapper mapper = new ObjectMapper();
        JsonNode root = mapper.readTree(response.body());
        return root.path("content").get(0).path("text").asText();
    }

    /**
     * Pulls the JSON array out of Claude's response (which is sometimes
     * wrapped in stray prose despite the prompt) and converts it into our
     * normalized row shape.
     */
    private List<Map<String, String>> parseTransactions(String json) {
        List<Map<String, String>> result = new ArrayList<>();
        try {
            ObjectMapper mapper = new ObjectMapper();
            int start = json.indexOf("[");
            int end = json.lastIndexOf("]") + 1;
            if (start == -1 || end == 0) return result;

            JsonNode array = mapper.readTree(json.substring(start, end));
            for (JsonNode node : array) {
                Map<String, String> row = new HashMap<>();
                row.put("date", node.path("date").asText());
                row.put("description", node.path("description").asText());
                row.put("amount", node.path("amount").asText());
                row.put("category", node.path("category").asText("Other"));
                // Tag with our source bank so the frontend preview shows it
                // alongside the other CSV/Plaid imports.
                row.put("bankName", SOURCE_BANK_NAME);
                result.add(row);
            }
        } catch (Exception e) {
            System.err.println("Failed to parse transactions: " + e.getMessage());
        }
        return result;
    }
}
