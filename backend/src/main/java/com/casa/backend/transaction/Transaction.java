package com.casa.backend.transaction;

import com.casa.backend.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Represents a financial transaction belonging to a specific user.
 * This class maps directly to the "transactions" table in the database.
 */
@Entity
@Table(name = "transactions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Transaction {
    /**
     * Auto-generated unique ID for each transaction.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * The user who owns this transaction.
     * This creates a foreign key column named "user_id" in the transactions table.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * Date of the transaction
     */
    private LocalDate date;

    /**
     * Description of the transaction
     */
    private String description;

    /**
     * Category of the transaction
     */
    private String category;

    /**
     * Amount of the transaction.
     * Positive = income, Negative = expense.
     */
    private BigDecimal amount;

    /**
     * Plaid's stable transaction_id, set only for transactions imported from Plaid.
     * Used to dedupe incremental syncs. NULL for manually-added or CSV-imported rows.
     */
    @Column(name = "plaid_transaction_id", length = 100)
    private String plaidTransactionId;

    /**
     * Source of the transaction:
     *  - For Plaid-imported rows: the institution name (e.g. "Chase", "Bank of America").
     *  - For CSV-imported rows: the bank name detected by the Gemini CSV parser.
     *  - For manually-added rows: the string "Manual".
     * Replaces the old "status" concept on the frontend.
     */
    @Column(name = "bank_name", length = 100)
    private String bankName;
}
