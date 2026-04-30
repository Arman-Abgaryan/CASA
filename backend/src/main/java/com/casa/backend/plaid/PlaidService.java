package com.casa.backend.plaid;

import com.casa.backend.transaction.Transaction;
import com.casa.backend.transaction.TransactionRepository;
import com.casa.backend.user.User;
import com.plaid.client.model.*;
import com.plaid.client.request.PlaidApi;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import retrofit2.Response;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * All Plaid-facing logic. Handles:
 *  1. Creating short-lived link tokens (used by the frontend to open Plaid Link)
 *  2. Exchanging the public_token from Plaid Link for a long-lived access_token
 *  3. Syncing transactions and persisting them as Transaction rows
 *
 * Naming note: Plaid's SDK has its own class also called "Transaction"
 * (com.plaid.client.model.Transaction). We import all Plaid models with a
 * wildcard but refer to OUR entity by its full package path where it could
 * collide (in syncTransactions only).
 */
@Service
@RequiredArgsConstructor
public class PlaidService {

    private final PlaidApi plaidApi;
    private final PlaidItemRepository plaidItemRepository;
    private final TransactionRepository transactionRepository;

    /**
     * Step 1: ask Plaid for a link_token. The frontend uses this to open the
     * Plaid Link UI. The token is short-lived (~30 minutes) and tied to one user.
     */
    public String createLinkToken(User user) throws IOException {
        LinkTokenCreateRequestUser plaidUser = new LinkTokenCreateRequestUser()
                .clientUserId(user.getId().toString());

        LinkTokenCreateRequest request = new LinkTokenCreateRequest()
                .user(plaidUser)
                .clientName("CASA")
                .products(List.of(Products.TRANSACTIONS))
                .countryCodes(List.of(CountryCode.US))
                .language("en");

        Response<LinkTokenCreateResponse> response = plaidApi.linkTokenCreate(request).execute();

        if (!response.isSuccessful() || response.body() == null) {
            throw new RuntimeException("Failed to create Plaid link token: " +
                    (response.errorBody() != null ? response.errorBody().string() : response.message()));
        }

        return response.body().getLinkToken();
    }

    /**
     * Step 2: trade the short-lived public_token (from Plaid Link's onSuccess)
     * for a long-lived access_token. Persist that token in plaid_items.
     */
    @Transactional
    public PlaidItem exchangePublicToken(User user, String publicToken, String institutionName) throws IOException {
        ItemPublicTokenExchangeRequest request = new ItemPublicTokenExchangeRequest()
                .publicToken(publicToken);

        Response<ItemPublicTokenExchangeResponse> response =
                plaidApi.itemPublicTokenExchange(request).execute();

        if (!response.isSuccessful() || response.body() == null) {
            throw new RuntimeException("Failed to exchange public token: " +
                    (response.errorBody() != null ? response.errorBody().string() : response.message()));
        }

        ItemPublicTokenExchangeResponse body = response.body();

        PlaidItem item = PlaidItem.builder()
                .user(user)
                .accessToken(body.getAccessToken())
                .itemId(body.getItemId())
                .institutionName(institutionName != null ? institutionName : "Bank")
                .createdAt(Instant.now())
                .build();

        return plaidItemRepository.save(item);
    }

    /**
     * Step 3: pull transactions for every Item this user has linked, and save
     * the new ones into our transactions table.
     *
     * Returns a summary of how many were added/modified/removed across all Items.
     */
    @Transactional

    @Transactional
    public void removeItem(User user, Long itemId) throws IOException {
        PlaidItem item = plaidItemRepository.findByIdAndUser(itemId, user)
                .orElseThrow(() -> new RuntimeException("Linked bank not found"));

        ItemRemoveRequest request = new ItemRemoveRequest()
                .accessToken(item.getAccessToken());

        Response<ItemRemoveResponse> response = plaidApi.itemRemove(request).execute();
        if (!response.isSuccessful()) {
            throw new RuntimeException("Failed to remove Plaid item: " +
                    (response.errorBody() != null ? response.errorBody().string() : response.message()));
        }

        plaidItemRepository.delete(item);
    }

    public Map<String, Object> syncAllItems(User user) throws IOException {
        List<PlaidItem> items = plaidItemRepository.findAllByUser(user);

        int totalAdded = 0;
        int totalModified = 0;
        int totalRemoved = 0;

        for (PlaidItem item : items) {
            Map<String, Integer> result = syncOneItem(item, user);
            totalAdded += result.get("added");
            totalModified += result.get("modified");
            totalRemoved += result.get("removed");
        }

        Map<String, Object> summary = new HashMap<>();
        summary.put("itemsSynced", items.size());
        summary.put("added", totalAdded);
        summary.put("modified", totalModified);
        summary.put("removed", totalRemoved);
        return summary;
    }

    /**
     * Syncs one PlaidItem. Plaid's /transactions/sync endpoint is incremental:
     * pass the cursor we saved last time, and Plaid returns only what's new or
     * changed since then. We may need multiple calls if hasMore=true.
     */
    private Map<String, Integer> syncOneItem(PlaidItem item, User user) throws IOException {
        int added = 0, modified = 0, removed = 0;
        String cursor = item.getSyncCursor();
        boolean hasMore = true;

        while (hasMore) {
            TransactionsSyncRequest request = new TransactionsSyncRequest()
                    .accessToken(item.getAccessToken());
            // Plaid rejects null cursor — only set when we have one
            if (cursor != null) {
                request.setCursor(cursor);
            }

            Response<TransactionsSyncResponse> response = plaidApi.transactionsSync(request).execute();
            if (!response.isSuccessful() || response.body() == null) {
                throw new RuntimeException("Plaid sync failed: " +
                        (response.errorBody() != null ? response.errorBody().string() : response.message()));
            }

            TransactionsSyncResponse body = response.body();

            for (com.plaid.client.model.Transaction plaidTx : body.getAdded()) {
                if (savePlaidTransaction(plaidTx, user)) {
                    added++;
                }
            }

            for (com.plaid.client.model.Transaction plaidTx : body.getModified()) {
                if (updatePlaidTransaction(plaidTx, user)) {
                    modified++;
                }
            }

            for (RemovedTransaction removedTx : body.getRemoved()) {
                transactionRepository.deleteByPlaidTransactionIdAndUser(removedTx.getTransactionId(), user);
                removed++;
            }

            cursor = body.getNextCursor();
            hasMore = Boolean.TRUE.equals(body.getHasMore());
        }

        item.setSyncCursor(cursor);
        item.setLastSyncedAt(Instant.now());
        plaidItemRepository.save(item);

        Map<String, Integer> counts = new HashMap<>();
        counts.put("added", added);
        counts.put("modified", modified);
        counts.put("removed", removed);
        return counts;
    }

    /**
     * Convert a Plaid transaction to our Transaction entity and save it.
     * Skips if we've already saved this plaid_transaction_id.
     * Returns true if a new row was inserted.
     */
    private boolean savePlaidTransaction(com.plaid.client.model.Transaction plaidTx, User user) {
        // Idempotency guard: don't double-save if cursor was lost mid-sync
        Transaction existing = transactionRepository.findByPlaidTransactionIdAndUser(
                plaidTx.getTransactionId(), user);
        if (existing != null) return false;

        Transaction tx = Transaction.builder()
                .user(user)
                .plaidTransactionId(plaidTx.getTransactionId())
                .date(plaidTx.getDate())
                .description(plaidTx.getName() != null ? plaidTx.getName() : "Unknown")
                .amount(plaidAmountToOurSign(plaidTx.getAmount()))
                .category(mapPlaidCategory(plaidTx))
                .build();

        transactionRepository.save(tx);
        return true;
    }

    /**
     * If Plaid reports a modified transaction (e.g. pending → posted), update
     * the matching row in place. Returns true if we found and updated a row.
     */
    private boolean updatePlaidTransaction(com.plaid.client.model.Transaction plaidTx, User user) {
        Transaction existing = transactionRepository.findByPlaidTransactionIdAndUser(
                plaidTx.getTransactionId(), user);
        if (existing == null) {
            // Modified before we'd ever seen it — treat as add
            return savePlaidTransaction(plaidTx, user);
        }

        existing.setDate(plaidTx.getDate());
        existing.setDescription(plaidTx.getName() != null ? plaidTx.getName() : existing.getDescription());
        existing.setAmount(plaidAmountToOurSign(plaidTx.getAmount()));
        existing.setCategory(mapPlaidCategory(plaidTx));
        transactionRepository.save(existing);
        return true;
    }

    /**
     * Plaid convention:   positive = money OUT (debit/expense), negative = money IN (credit/income).
     * Our app convention: positive = income, negative = expense.
     * We flip the sign and round to 2 decimals.
     */
    private BigDecimal plaidAmountToOurSign(Double plaidAmount) {
        if (plaidAmount == null) return BigDecimal.ZERO;
        return BigDecimal.valueOf(-plaidAmount).setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Map Plaid's personal_finance_category to one of our app's categories.
     * Falls back to "Other" if no match.
     */
    private String mapPlaidCategory(com.plaid.client.model.Transaction plaidTx) {
        PersonalFinanceCategory pfc = plaidTx.getPersonalFinanceCategory();
        if (pfc == null || pfc.getPrimary() == null) return "Other";

        return switch (pfc.getPrimary()) {
            case "FOOD_AND_DRINK" -> "Food";
            case "INCOME" -> "Paycheck";
            case "LOAN_PAYMENTS", "RENT_AND_UTILITIES" -> "Bills";
            case "GENERAL_MERCHANDISE", "HOME_IMPROVEMENT", "PERSONAL_CARE" -> "Shopping";
            case "TRAVEL" -> "Vacation";
            case "TRANSPORTATION" -> "Transport";
            case "ENTERTAINMENT" -> "Entertainment";
            case "MEDICAL" -> "Health";
            default -> "Other";
        };
    }
}
