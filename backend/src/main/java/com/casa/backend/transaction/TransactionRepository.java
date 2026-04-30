package com.casa.backend.transaction;

import java.time.LocalDate;
import java.math.BigDecimal;
import com.casa.backend.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository interface for performing CRUD operations on transactions.
 * Spring Data JPA automatically implements all basic operations.
 */
@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    /**
     * Retrieves all transaction that belong to a specific user.
     */
    List<Transaction> findAllByUser(User user);

    /**
     * Deletes all transactions whose IDs are in the provided list and belong to the
     * specified user. Used for bulk delete operations.
     */
    @Modifying
    @Query("DELETE FROM Transaction t WHERE t.id IN :ids AND t.user = :user")
    void deleteAllByIdInAndUser(@Param("ids") List<Long> ids, @Param("user") User user);

    /**
     * Finds a transaction matching all provided fields for a specific user.
     * Used for deduplication during CSV import.
     */
    Transaction findByDateAndDescriptionAndAmountAndCategoryAndUser(
            LocalDate date, String description, BigDecimal amount, String category, User user);

    /**
     * Looks up a transaction by Plaid's stable transaction ID, scoped to a user.
     * Used during Plaid sync to skip transactions we've already imported.
     */
    Transaction findByPlaidTransactionIdAndUser(String plaidTransactionId, User user);

    /**
     * Deletes a transaction by Plaid transaction_id and user.
     * Used when Plaid reports a removed transaction during sync.
     */
    @Modifying
    @Query("DELETE FROM Transaction t WHERE t.plaidTransactionId = :plaidId AND t.user = :user")
    void deleteByPlaidTransactionIdAndUser(@Param("plaidId") String plaidId, @Param("user") User user);
}
