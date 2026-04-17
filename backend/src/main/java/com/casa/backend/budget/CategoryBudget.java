package com.casa.backend.budget;

import com.casa.backend.user.User;
import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.math.BigDecimal;

@Entity
@Table(name = "category_budgets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CategoryBudget {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String category;

    @Column(nullable = false)
    private BigDecimal maxAmount;

    @ManyToOne
    @JoinColumn(name = "budget_id")
    @JsonIgnore
    private Budget budget;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;
}
