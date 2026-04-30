package com.casa.backend.budget;

import com.casa.backend.user.User;
import com.casa.backend.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for managing user budgets.
 * Handles creating, retrieving, and deleting monthly budgets under
 * /api/budgets.
 */
@RestController
@RequestMapping("/api/budgets")
@RequiredArgsConstructor
public class BudgetController {

    private final BudgetService budgetService;
    private final UserService userService;

    /**
     * Retrieves all budgets belonging to the authenticated user.
     *
     * @return A list of budgets for the current user.
     */
    @GetMapping
    public List<Budget> getBudgets() {
        User user = userService.getAuthenticatedUser();
        return budgetService.getBudgetsForUser(user);
    }

    /**
     * Creates a new budget for the authenticated user.
     *
     * @param budget The budget object containing the maxAmount to set.
     * @return The saved Budget object with its generated ID.
     */
    @PostMapping
    public Budget createBudget(@RequestBody Budget budget) {
        User user = userService.getAuthenticatedUser();
        return budgetService.createBudget(user, budget);
    }
    
    /**
     * Deletes a budget by its ID.
     * Only deletes if the budget belongs to the authenticated user.
     *
     * @param id The ID of the budget to delete.
     */
    @DeleteMapping("/{id}")
    public void deleteBudget(@PathVariable Long id) {
        User user = userService.getAuthenticatedUser();
        budgetService.deleteBudget(user, id);
    }
}
