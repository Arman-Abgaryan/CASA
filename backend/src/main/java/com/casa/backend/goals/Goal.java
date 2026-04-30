package com.casa.backend.goals;

import com.casa.backend.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * Represents a goal belonging to a specific user.
 * Tracks the goal name, current saved amount, and target amount.
 * Maps directly to the "goal" table in the database.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Goal {
    
    /** Auto-generated unique ID for each goal. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Auto-generated unique ID for each goal. */
    private String name;

    /** The amount currently saved toward the goal. */
    private BigDecimal currentAmount;

    /** The target amount the user wants to reach. */
    private BigDecimal targetAmount;

    /** The user who owns this goal. */
    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

}
