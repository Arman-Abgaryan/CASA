package com.casa.backend.plaid;

import com.casa.backend.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * One row per bank connection a user has linked via Plaid.
 *
 * Plaid calls a linked account an "Item." Each Item has:
 *  - an access_token (long-lived, secret — never expose to the frontend)
 *  - an item_id (Plaid's own identifier)
 *  - a sync cursor (so /transactions/sync only returns new/changed transactions)
 */
@Entity
@Table(name = "plaid_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PlaidItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The user who owns this bank connection. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Plaid's long-lived access token. Treat as a secret. */
    @Column(name = "access_token", nullable = false, length = 500)
    private String accessToken;

    /** Plaid's identifier for this Item (one per linked bank). */
    @Column(name = "item_id", nullable = false, length = 100)
    private String itemId;

    /** Bank name (e.g. "Chase", "Wells Fargo"), captured from Plaid Link metadata. */
    @Column(name = "institution_name", length = 200)
    private String institutionName;

    /**
     * Cursor for incremental transaction sync.
     * Null on first sync; updated after each successful sync call.
     */
    @Column(name = "sync_cursor", length = 500)
    private String syncCursor;

    /** When the connection was first created. */
    @Column(name = "created_at")
    private Instant createdAt;

    /** When transactions were last successfully synced. */
    @Column(name = "last_synced_at")
    private Instant lastSyncedAt;
}
