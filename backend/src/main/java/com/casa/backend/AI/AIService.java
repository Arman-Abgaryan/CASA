package com.casa.backend.AI;

import com.casa.backend.transaction.Transaction;
import com.casa.backend.transaction.TransactionRepository;
import com.casa.backend.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;

import com.casa.backend.budget.Budget;
import com.casa.backend.budget.BudgetRepository;
import com.casa.backend.goals.Goal;
import com.casa.backend.goals.GoalRepository;

@Service
@RequiredArgsConstructor
public class AIService {

    @Value("${anthropic.api.key}")
    private String apiKey;

    private final TransactionRepository transactionRepository;
    private final BudgetRepository budgetRepository;
    private final GoalRepository goalRepository;

    public String chat(String userMessage, List<Map<String, String>> history, User user) {
        List<Transaction> transactions = transactionRepository.findAllByUser(user);

        StringBuilder context = new StringBuilder();
        context.append(
                "You are Benjamin, a friendly financial advisor for the CASA personal finance app. Keep ALL responses under 3 sentences. Be direct and concise. No markdown, no bullet points, plain text only. ");
        context.append("Here is the user's transaction history:\n");

        for (Transaction t : transactions) {
            context.append(String.format("- %s: %s $%.2f (%s)\n",
                    t.getDate(), t.getDescription(), t.getAmount(), t.getCategory()));
        }

        List<Budget> budgets = budgetRepository.findAllByUser(user);
        context.append("\nUser's budgets:\n");
        for (Budget b : budgets) {
            context.append(String.format("- Budget: $%.2f max amount\n", b.getMaxAmount()));
        }

        List<Goal> goals = goalRepository.findAllByUser(user);
        context.append("\nUser's savings goals:\n");
        for (Goal g : goals) {
            context.append(String.format("- %s: $%.2f saved of $%.2f target\n",
                    g.getName(), g.getCurrentAmount(), g.getTargetAmount()));
        }

        context.append("\nBased on this data, answer the user's question helpfully and concisely.");

        StringBuilder messages = new StringBuilder();
        messages.append("[");
        if (history != null) {
            for (Map<String, String> msg : history) {
                messages.append(String.format("{\"role\": \"%s\", \"content\": %s},",
                        msg.get("role"), toJsonString(msg.get("content"))));
            }
        }
        messages.append(String.format("{\"role\": \"user\", \"content\": %s}",
                toJsonString(userMessage)));
        messages.append("]");

        String body = """
                {
                    "model": "claude-haiku-4-5-20251001",
                    "max_tokens": 1024,
                    "system": %s,
                    "messages": %s
                }
                """.formatted(toJsonString(context.toString()), messages.toString());

        try {
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.anthropic.com/v1/messages"))
                    .header("Content-Type", "application/json")
                    .header("x-api-key", apiKey)
                    .header("anthropic-version", "2023-06-01")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            String responseBody = response.body();

            System.out.println("Anthropic response: " + responseBody);

            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            com.fasterxml.jackson.databind.JsonNode root = mapper.readTree(responseBody);

            com.fasterxml.jackson.databind.JsonNode contentArray = root.path("content");
            if (contentArray.isArray() && contentArray.size() > 0) {
                return contentArray.get(0).path("text").asText();
            } else {
                return root.path("error").path("message").asText("No response from Benjamin.");
            }

        } catch (Exception e) {
            throw new RuntimeException("Failed to call Anthropic API: " + e.getMessage(), e);
        }
    }

    private String toJsonString(String text) {
        return "\"" + text
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t")
                + "\"";
    }
}