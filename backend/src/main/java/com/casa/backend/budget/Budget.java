package com.casa.backend.budget;

import com.casa.backend.user.User;
import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

import java.util.List;
import java.util.ArrayList;
import com.casa.backend.budget.CategoryBudget;
/**
 * Represents a user's monthly budget limit.
 * The actual spending (currentAmount) is calculated
 * from transactions on the frontend — it is NOT stored here.
 */
@Entity
@Table(name = "budgets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Budget {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * The user who owns this budget.
     */
    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;    

     /**
     * Name of the budget (e.g., "Monthly Budget" or category name).
     */
    private String name;

    /**
     * Maximum allowed spending for this budget.
     * (Frontend computes current spending via transactions.)
     */
    @Column(nullable = false)
    private BigDecimal maxAmount;

    @JsonIgnore
    @OneToMany(mappedBy = "budget", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CategoryBudget> categoryBudgets = new ArrayList<>();

}
