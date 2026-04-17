package com.casa.backend.budget;

import com.casa.backend.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BudgetService {
    private final BudgetRepository budgetRepository;

    /**
     * Returns all budgets for the logged-in user.
     */
    public List<Budget> getBudgetsForUser(User user) {
        return budgetRepository.findAllByUser(user);
    }

    /**
     * Creates and saves a new budget for the user.
     *
     * @param user The authenticated user to associate with the budget.
     * @param budget The budget object containing the maxAmount.
     * @return The saved Budget with its generated ID.
     */
    public Budget createBudget(User user, Budget budget) {
        budget.setUser(user); // Link to correct user
        return budgetRepository.save(budget);
    }

    /**
     * Deletes a budget if it belongs to the authenticated user.
     * Throws an exception if the budget is not found or does not belong to the
     * user.
     *
     * @param user The authenticated user.
     * @param budgetId The ID of the budget to delete.
     */
    public void deleteBudget(User user, Long budgetId) {
        Budget budget = budgetRepository.findById(budgetId)
                .orElseThrow(() -> new RuntimeException("Budget not found"));
    
        if (!budget.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }
    
        budgetRepository.delete(budget);
    }    
}
