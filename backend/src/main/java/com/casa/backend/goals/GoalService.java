package com.casa.backend.goals;

import com.casa.backend.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

/**
 * Service class for managing savings goal business logic.
 * Handles creating, retrieving, updating, and deleting goals for authenticated
 * users.
 */
@Service
@RequiredArgsConstructor
public class GoalService {
    
    private final GoalRepository goalRepository;

    /**
     * Retrieves all savings goals for the authenticated user.
     *
     * @param user The authenticated user.
     * @return A list of goals belonging to the user.
     */
    public List<Goal> getGoals(User user) {
        return goalRepository.findAllByUser(user);
    }
    
    /**
     * Creates a new savings goal for the authenticated user.
     *
     * @param user The authenticated user to associate with the goal.
     * @param request The request containing name, currentAmount, and targetAmount.
     * @return The saved Goal object with its generated ID.
     */
    public Goal createGoal(User user, GoalRequest request) {
        Goal goal = Goal.builder()
                .name(request.getName())
                .currentAmount(request.getCurrentAmount())
                .targetAmount(request.getTargetAmount())
                .user(user)
                .build();

        return goalRepository.save(goal);
    }

    /**
     * Updates the current saved amount for an existing goal.
     * Throws an exception if the goal is not found or does not belong to the user.
     *
     * @param user The authenticated user.
     * @param goalId The ID of the goal to update.
     * @param newAmount The new current saved amount.
     * @return The updated Goal object.
     */
    public Goal updateGoal(User user, Long goalId, BigDecimal newAmount) {
        Goal goal = goalRepository.findById(goalId)
                .orElseThrow(() -> new RuntimeException("Goal not found"));

        if (!goal.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }

        goal.setCurrentAmount(newAmount);
        return goalRepository.save(goal);
    }

    /**
     * Deletes a savings goal if it belongs to the authenticated user.
     * Throws an exception if the goal is not found or does not belong to the user.
     *
     * @param user The authenticated user.
     * @param goalId The ID of the goal to delete.
     */
    public void deleteGoal(User user, Long goalId) {
        Goal goal = goalRepository.findById(goalId)
        .orElseThrow(() -> new RuntimeException("Goal not found"));    
    
        if (!goal.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }

        goalRepository.delete(goal);
    }
}
