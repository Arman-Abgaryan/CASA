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
import java.time.LocalDate;
import java.math.BigDecimal;

/**
 * Repository interface for performing CRUD operations on transactions.
 * Spring Data JPA automatically implements all basic operations.
 */
@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    /**
     * Retrieves all transaction that belong to a specific user.
     *
     * @param user The user whose transactions should be returned
     * @return A list of transactions belonging to the user.
     */
    List<Transaction> findAllByUser(User user);

    @Modifying
    @Query("DELETE FROM Transaction t WHERE t.id IN :ids AND t.user = :user")
    void deleteAllByIdInAndUser(@Param("ids") List<Long> ids, @Param("user") User user);

    Transaction findByDateAndDescriptionAndAmountAndCategoryAndUser(LocalDate date, String description, BigDecimal amount, String category, User user);
}
