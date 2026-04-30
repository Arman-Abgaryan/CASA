package com.casa.backend.transaction;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/**
 * Sends a raw CSV file (as a single text blob) to the Gemini API and asks it
 * to identify the bank and extract structured transactions.
 *
 * Why Gemini and not a hand-rolled parser? Bank CSV layouts vary wildly —
 * different column orders, different date formats, separate debit/credit
 * columns, occasional preamble rows, etc. Letting an LLM normalize the file
 * removes a huge amount of bespoke parsing code.
 *
 * Uses the free `gemini-2.5-flash` model with structured-JSON output so we
 * always get a parseable response back.
 */
@Service
@RequiredArgsConstructor
public class GeminiCsvParserService {

    @Value("${gemini.api.key:}")
    private String apiKey;

    @Value("${gemini.api.model:gemini-2.5-flash}")
    private String model;

    private static final String GEMINI_URL_TEMPLATE =
            "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s";

    /**
     * Allowed categories. These mirror the categories the rest of the app
     * already knows about (see AddTransactionModal on the frontend and
     * PlaidService.mapPlaidCategory on the backend), so a row imported
     * from CSV looks identical to one imported from Plaid.
     */
    private static final List<String> ALLOWED_CATEGORIES = List.of(
            "Food", "Paycheck", "Bills", "Shopping", "Vacation",
            "Transport", "Entertainment", "Health", "Other");

    private final ObjectMapper mapper = new ObjectMapper();

    /**
     * Parsed result from a single CSV upload.
     */
    public record ParsedCsv(String bankName, List<ParsedRow> rows) {}

    /**
     * One row as returned by Gemini. Strings (not BigDecimal/LocalDate) so the
     * caller can handle final coercion + per-row error reporting.
     */
    public record ParsedRow(String date, String description, String amount, String category) {}

    /**
     * Calls the Gemini API and returns the parsed result.
     *
     * @throws IllegalStateException if the API key is not configured.
     * @throws RuntimeException for any HTTP / JSON / network failure.
     */
    public ParsedCsv parse(String csvContent) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException(
                    "Gemini API key is not configured. Set the GEMINI_API_KEY environment variable.");
        }

        String requestBody = buildRequestBody(csvContent);
        String responseBody = sendRequest(requestBody);
        return parseResponse(responseBody);
    }

    /**
     * Builds the JSON request body for the Gemini API.
     * Uses responseSchema so the model is required to emit JSON with the
     * exact shape we want — no parsing of free-form text on our side.
     */
    private String buildRequestBody(String csvContent) {
        // Build the prompt - explicit, rules-only, no examples to keep the
        // payload small and the model focused.
        String prompt = """
                You are a CSV parser for a personal finance app.

                You will be given the raw text of a bank-issued transaction CSV file.
                Your job:
                  1. Identify the bank that issued this file (e.g. "Chase",
                     "Bank of America", "Citibank", "Wells Fargo", "Capital One",
                     "American Express", "Discover"). If you cannot tell from the
                     headers/format, return "Unknown".
                  2. For every transaction row in the file, return:
                       - date: ISO format YYYY-MM-DD
                       - description: the merchant or memo, trimmed
                       - amount: a signed decimal string. NEGATIVE for expenses
                         (money out), POSITIVE for income (money in). Strip
                         currency symbols and thousands separators.
                       - category: one of exactly these values:
                         %s
                         Pick the best fit based on the description. If nothing
                         fits, use "Other".
                  3. Skip header rows, blank lines, and any summary/total rows.

                Here is the CSV:
                ---
                %s
                ---
                """.formatted(String.join(", ", ALLOWED_CATEGORIES), csvContent);

        // The responseSchema constrains Gemini's JSON output. The OpenAPI-style
        // schema dialect that Gemini accepts is a subset of JSON Schema.
        ObjectMapper m = mapper;
        var root = m.createObjectNode();

        var contents = m.createArrayNode();
        var content = m.createObjectNode();
        var parts = m.createArrayNode();
        var part = m.createObjectNode();
        part.put("text", prompt);
        parts.add(part);
        content.set("parts", parts);
        contents.add(content);
        root.set("contents", contents);

        var generationConfig = m.createObjectNode();
        generationConfig.put("responseMimeType", "application/json");

        var responseSchema = m.createObjectNode();
        responseSchema.put("type", "OBJECT");
        var properties = m.createObjectNode();

        var bankNameProp = m.createObjectNode();
        bankNameProp.put("type", "STRING");
        properties.set("bankName", bankNameProp);

        var rowsProp = m.createObjectNode();
        rowsProp.put("type", "ARRAY");
        var items = m.createObjectNode();
        items.put("type", "OBJECT");
        var itemProps = m.createObjectNode();

        var dateProp = m.createObjectNode();
        dateProp.put("type", "STRING");
        itemProps.set("date", dateProp);

        var descProp = m.createObjectNode();
        descProp.put("type", "STRING");
        itemProps.set("description", descProp);

        var amountProp = m.createObjectNode();
        amountProp.put("type", "STRING");
        itemProps.set("amount", amountProp);

        var categoryProp = m.createObjectNode();
        categoryProp.put("type", "STRING");
        categoryProp.set("enum", m.valueToTree(ALLOWED_CATEGORIES));
        itemProps.set("category", categoryProp);

        items.set("properties", itemProps);
        items.set("required", m.valueToTree(List.of("date", "description", "amount", "category")));
        rowsProp.set("items", items);
        properties.set("rows", rowsProp);

        responseSchema.set("properties", properties);
        responseSchema.set("required", m.valueToTree(List.of("bankName", "rows")));

        generationConfig.set("responseSchema", responseSchema);
        // Keep responses deterministic-ish for the same input.
        generationConfig.put("temperature", 0);

        root.set("generationConfig", generationConfig);

        try {
            return mapper.writeValueAsString(root);
        } catch (Exception e) {
            throw new RuntimeException("Failed to build Gemini request body", e);
        }
    }

    /**
     * Posts the request body to Gemini and returns the raw response body.
     */
    private String sendRequest(String requestBody) {
        String url = String.format(GEMINI_URL_TEMPLATE, model, apiKey);

        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(15))
                .build();

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(60))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        try {
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) {
                throw new RuntimeException(
                        "Gemini API returned HTTP " + response.statusCode() + ": " + response.body());
            }
            return response.body();
        } catch (RuntimeException re) {
            throw re;
        } catch (Exception e) {
            throw new RuntimeException("Failed to call Gemini API: " + e.getMessage(), e);
        }
    }

    /**
     * Pulls the structured payload out of the Gemini response envelope.
     * Gemini returns:
     *   { candidates: [ { content: { parts: [ { text: "<our JSON string>" } ] } } ] }
     */
    private ParsedCsv parseResponse(String responseBody) {
        try {
            JsonNode root = mapper.readTree(responseBody);
            JsonNode candidates = root.path("candidates");
            if (!candidates.isArray() || candidates.isEmpty()) {
                throw new RuntimeException("Gemini returned no candidates: " + responseBody);
            }
            JsonNode parts = candidates.get(0).path("content").path("parts");
            if (!parts.isArray() || parts.isEmpty()) {
                throw new RuntimeException("Gemini returned no content parts: " + responseBody);
            }
            String payloadText = parts.get(0).path("text").asText();
            JsonNode payload = mapper.readTree(payloadText);

            String bankName = payload.path("bankName").asText("Unknown");
            if (bankName.isBlank()) bankName = "Unknown";

            List<ParsedRow> rows = new ArrayList<>();
            JsonNode rowsNode = payload.path("rows");
            if (rowsNode.isArray()) {
                for (JsonNode r : rowsNode) {
                    rows.add(new ParsedRow(
                            r.path("date").asText(""),
                            r.path("description").asText(""),
                            r.path("amount").asText(""),
                            r.path("category").asText("Other")
                    ));
                }
            }
            return new ParsedCsv(bankName, rows);
        } catch (RuntimeException re) {
            throw re;
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse Gemini response: " + e.getMessage(), e);
        }
    }
}
