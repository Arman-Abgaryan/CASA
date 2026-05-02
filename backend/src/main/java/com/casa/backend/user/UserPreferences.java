package com.casa.backend.user;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

/**
 * Per-user notification + display preferences. 1:1 with User.
 *
 * The "lastBudgetAlertMonth" / "lastBudgetAlertLevel" pair is used to
 * deduplicate budget threshold alert emails: once we've sent (say) the 80%
 * alert for October 2025, we won't send another 80% alert until November.
 * The level is monotonic within a month (50 → 80 → 100), so we only ever
 * fire each higher threshold once per month per user.
 */
@Entity
@Table(name = "user_preferences")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserPreferences {

    /** Shares its primary key with User.id. */
    @Id
    @Column(name = "user_id")
    private Long userId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    // ---- Budget threshold alerts ----
    @Column(name = "notify_budget_50", nullable = false)
    @Builder.Default
    private boolean notifyBudget50 = false;

    @Column(name = "notify_budget_80", nullable = false)
    @Builder.Default
    private boolean notifyBudget80 = true;

    @Column(name = "notify_budget_100", nullable = false)
    @Builder.Default
    private boolean notifyBudget100 = true;

    // ---- Account security alerts ----
    @Column(name = "notify_login", nullable = false)
    @Builder.Default
    private boolean notifyLogin = false;

    // ---- Periodic emails ----
    @Column(name = "weekly_summary", nullable = false)
    @Builder.Default
    private boolean weeklySummary = false;

    // ---- Internal: dedupe budget alerts within a month ----
    /**
     * First day of the month for which we last sent a budget alert.
     * Null if we've never sent one.
     */
    @Column(name = "last_budget_alert_month")
    private LocalDate lastBudgetAlertMonth;

    /**
     * Highest threshold (50, 80, 100) we've sent for the month above.
     * 0 if no alert sent yet for that month.
     */
    @Column(name = "last_budget_alert_level", nullable = false)
    @Builder.Default
    private int lastBudgetAlertLevel = 0;
}
