// Constraint Compliance Proof
// ===========================
// Proves the AI portfolio agent respected the investor's constraints
// when constructing the portfolio. The investor specified parameters
// (min rating, max exposure, min bonds, target yield) and this proof
// verifies the private allocations satisfy all of them.

fn main(
    // Private: actual portfolio allocations
    weights_bps: [u64; 8],
    coupon_rates_bps: [u64; 8],
    rating_indices: [u8; 8],
    amounts: [u64; 8],

    // Public: investor's original constraints
    constraint_min_rating_index: pub u8,    // worst acceptable (higher = worse)
    constraint_max_rating_index: pub u8,    // best acceptable (lower = better)
    constraint_max_single_exposure_bps: pub u64,
    constraint_min_bonds: pub u8,
    constraint_target_yield_bps: pub u64,

    // Public: what the portfolio actually achieved
    actual_weighted_coupon_bps: pub u64,
    actual_num_bonds: pub u8,
) {
    // --- 1. Count active bonds ---
    let mut num_bonds: u8 = 0;
    let mut total_weight: u64 = 0;
    for i in 0..8 {
        if amounts[i] > 0 {
            num_bonds += 1;
        }
        total_weight += weights_bps[i];
    }
    assert(num_bonds == actual_num_bonds, "Bond count mismatch");

    // --- 2. Weights sum to 100% ---
    assert(total_weight == 10000, "Weights must sum to 10000");

    // --- 3. Min bonds constraint ---
    assert(num_bonds >= constraint_min_bonds, "Below minimum bonds required");

    // --- 4. All ratings within investor's acceptable range ---
    for i in 0..8 {
        if amounts[i] > 0 {
            assert(
                rating_indices[i] >= constraint_max_rating_index,
                "Bond better than investor max rating",
            );
            assert(
                rating_indices[i] <= constraint_min_rating_index,
                "Bond worse than investor min rating",
            );
        }
    }

    // --- 5. No single bond exceeds max exposure ---
    for i in 0..8 {
        assert(
            weights_bps[i] <= constraint_max_single_exposure_bps,
            "Single exposure exceeds investor limit",
        );
    }

    // --- 6. Weighted coupon meets target yield ---
    let mut weighted_coupon_sum: u64 = 0;
    for i in 0..8 {
        weighted_coupon_sum += weights_bps[i] * coupon_rates_bps[i];
    }
    // Verify actual_weighted_coupon_bps is floor(sum / 10000)
    assert(
        actual_weighted_coupon_bps * 10000 <= weighted_coupon_sum,
        "Coupon too high",
    );
    assert(
        (actual_weighted_coupon_bps + 1) * 10000 > weighted_coupon_sum,
        "Coupon too low",
    );
    // Achieved yield must meet or exceed target
    assert(
        actual_weighted_coupon_bps >= constraint_target_yield_bps,
        "Portfolio yield below investor target",
    );

    // --- 7. Zero slots clean ---
    for i in 0..8 {
        if amounts[i] == 0 {
            assert(weights_bps[i] == 0, "Inactive slot weight");
            assert(coupon_rates_bps[i] == 0, "Inactive slot coupon");
            assert(rating_indices[i] == 0, "Inactive slot rating");
        }
    }
}
