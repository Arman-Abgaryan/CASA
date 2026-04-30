package com.casa.backend.plaid;

import com.plaid.client.ApiClient;
import com.plaid.client.request.PlaidApi;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;

/**
 * Configures the Plaid SDK client.
 *
 * Reads credentials and environment from these env vars:
 *  - PLAID_CLIENT_ID
 *  - PLAID_SECRET
 *  - PLAID_ENV  ("sandbox", "development", or "production")
 */
@Configuration
public class PlaidConfig {

    @Value("${plaid.client-id}")
    private String clientId;

    @Value("${plaid.secret}")
    private String secret;

    @Value("${plaid.env:sandbox}")
    private String env;

    /**
     * Builds a single PlaidApi instance reused across the app.
     */
    @Bean
    public PlaidApi plaidApi() {
        HashMap<String, String> apiKeys = new HashMap<>();
        apiKeys.put("clientId", clientId);
        apiKeys.put("secret", secret);
        apiKeys.put("plaidVersion", "2020-09-14");

        ApiClient apiClient = new ApiClient(apiKeys);

        // Map env string to the right Plaid endpoint
        switch (env.toLowerCase()) {
            case "production" -> apiClient.setPlaidAdapter(ApiClient.Production);
            case "development" -> apiClient.setPlaidAdapter(ApiClient.Development);
            default -> apiClient.setPlaidAdapter(ApiClient.Sandbox);
        }

        return apiClient.createService(PlaidApi.class);
    }
}
