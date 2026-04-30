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
 *  - PLAID_ENV  ("sandbox" or "production")
 *
 * Note: Plaid's Java SDK only exposes Sandbox and Production environments.
 * (The legacy "development" environment was removed in recent SDK versions.)
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
        if ("production".equalsIgnoreCase(env)) {
            apiClient.setPlaidAdapter(ApiClient.Production);
        } else {
            apiClient.setPlaidAdapter(ApiClient.Sandbox);
        }

        return apiClient.createService(PlaidApi.class);
    }
}
