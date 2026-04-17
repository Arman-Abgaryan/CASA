package com.casa.backend.goals;

import com.casa.backend.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * Repository interface for performing CRUD operations on goals.
 * Spring Data JPA automatically implements all basic operations.
 */
public interface GoalRepository extends JpaRepository <Goal, Long> {
    
    /**
     * Retrieves all goals belonging to a specific user.
     *
     * @param user The user whose goals should be returned.
     * @return A list of goals belonging to the user.
     */
    List<Goal> findAllByUser(User user);
}
