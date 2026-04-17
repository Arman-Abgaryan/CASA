package com.casa.backend.goals;

import com.casa.backend.user.User;
import com.casa.backend.user.UserService;
import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * REST controller for managing user savings goals.
 * Handles creating, retrieving, updating, and deleting goals under /api/goals.
 */
@RestController
@RequestMapping("/api/goals")
@RequiredArgsConstructor

public class GoalController {

    private final GoalService goalService;
    private final UserService userService;

    /**
     * Retrieves all savings goals belonging to the authenticated user.
     *
     * @return A list of goals for the current user.
     */
    @GetMapping
    public List<Goal> getGoals() {
        User user = userService.getAuthenticatedUser();
        return goalService.getGoals(user);
    }

    /**
     * Creates a new savings goal for the authenticated user.
     *
     * @param request The goal request containing name, currentAmount, and targetAmount.
     * @return The saved Goal object with its generated ID.
     */
    @PostMapping
    public Goal createGoal(@RequestBody GoalRequest request) {
        User user = userService.getAuthenticatedUser();
        return goalService.createGoal(user, request);
    }

    /**
     * Updates the current saved amount for an existing goal.
     *
     * @param id The ID of the goal to update.
     * @param request The request body containing the new currentAmount.
     * @return The updated Goal object.
     */
    @PutMapping("/{id}")
    public Goal updateGoal(@PathVariable Long id, @RequestBody GoalRequest request) {
        User user = userService.getAuthenticatedUser();
        return goalService.updateGoal(user, id, request.getCurrentAmount());
    }
    
    /**
     * Deletes a savings goal by its ID.
     * Only deletes if the goal belongs to the authenticated user.
     *
     * @param id The ID of the goal to delete.
     */
    @DeleteMapping("/{id}")
    public void deleteGoal(@PathVariable Long id) {
        User user = userService.getAuthenticatedUser();
        goalService.deleteGoal(user, id);
    }

}



