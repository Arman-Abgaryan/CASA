package com.casa.backend.goals;

/**
 * Utility class for performing goal-related calculations.
 * Contains static helper methods used to compute progress toward savings goals.
 * Note: This class is not currently used in the application but is kept for
 * future use.
 */
public class GoalCalculator {
    /**
     * Returns the percentage progress toward a financial goal.
     * Caps the result at 100% and returns -1 for invalid inputs.
     *
     * @param current The current saved amount.
     * @param target  The target amount to reach.
     * @return A percentage between 0 and 100, or -1 if the target is invalid.
     */
    public static double calculateProgress(double current, double target) {
        
        if (target <= 0) {
            return -1;
        } else {
            double percent = (current / target) * 100;

            if (percent < 0) {
                return -1;
            } else {
                return Math.min(percent, 100);
            }
        }
    }
}


