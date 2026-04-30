package com.casa.backend.plaid;

import com.casa.backend.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlaidItemRepository extends JpaRepository<PlaidItem, Long> {

    /** All bank connections belonging to a user. */
    List<PlaidItem> findAllByUser(User user);

    /** Look up a specific Item by Plaid's item_id (used during webhook handling later). */
    Optional<PlaidItem> findByItemId(String itemId);
}
