package com.casa.backend.goals;

import lombok.Data;

import java.math.BigDecimal;

/**
 * Data Transfer Object (DTO) for creating and updating savings goals.
 * Contains the fields sent from the frontend when a goal is created or updated.
 */
@Data
public class GoalRequest {
    private String name;
    private BigDecimal currentAmount;
    private BigDecimal targetAmount;
}
