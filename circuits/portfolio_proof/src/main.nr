// Portfolio Composition Proof (Proof 2)
// ======================================
// Proves aggregate portfolio properties are correctly computed from
// private per-bond holdings -- the core "dark pool" proof.
//
// Private: individual bond amounts, weights, coupons, ratings
// Public:  claimed aggregate properties
//
// 8 bond slots (pad unused with zeros).

fn main(
    // Private inputs: per-bond data (8 fixed slots)
    amounts: [u64; 8],
    weights_bps: [u64; 8],
    coupon_rates_bps: [u64; 8],
    rating_indices: [u8; 8],

    // Public inputs: claimed aggregate properties
    claimed_total_value: pub u64,
    claimed_weighted_coupon_bps: pub u64,
    claimed_num_bonds: pub u8,
    claimed_min_rating_index: pub u8,   // worst rating (higher index)
    claimed_max_rating_index: pub u8,   // best rating (lower index)
    claimed_max_single_exposure_bps: pub u64,
    claimed_diversification_score: pub u8,
) {
    // --- 1. Total value & bond count ---
    let mut computed_total: u64 = 0;
    let mut computed_count: u8 = 0;
    let mut computed_weight: u64 = 0;

    for i in 0..8 {
        computed_total += amounts[i];
        if amounts[i] > 0 {
            computed_count += 1;
        }
        computed_weight += weights_bps[i];
    }

    assert(computed_total == claimed_total_value, "Total value mismatch");
    assert(computed_count == claimed_num_bonds, "Bond count mismatch");

    // --- 2. Weights must sum to 10000 (100%) ---
    assert(computed_weight == 10000, "Weights must sum to 10000");

    // --- 3. Weighted coupon (division-free) ---
    // Verify: claimed_weighted_coupon_bps * 10000 <= sum(w_i * c_i)
    //     and (claimed_weighted_coupon_bps + 1) * 10000 > sum(w_i * c_i)
    // This proves claimed is floor(sum / 10000).
    let mut weighted_coupon_sum: u64 = 0;
    for i in 0..8 {
        weighted_coupon_sum += weights_bps[i] * coupon_rates_bps[i];
    }
    assert(
        claimed_weighted_coupon_bps * 10000 <= weighted_coupon_sum,
        "Weighted coupon too high",
    );
    assert(
        (claimed_weighted_coupon_bps + 1) * 10000 > weighted_coupon_sum,
        "Weighted coupon too low",
    );

    // --- 4. Rating indices within claimed range ---
    // Lower index = better rating. Only check active bonds.
    for i in 0..8 {
        if amounts[i] > 0 {
            assert(rating_indices[i] >= claimed_max_rating_index, "Rating below best claimed");
            assert(rating_indices[i] <= claimed_min_rating_index, "Rating above worst claimed");
        }
    }

    // --- 5. Tightness: at least one bond at each boundary ---
    let mut found_worst: bool = false;
    let mut found_best: bool = false;
    for i in 0..8 {
        if amounts[i] > 0 {
            if rating_indices[i] == claimed_min_rating_index {
                found_worst = true;
            }
            if rating_indices[i] == claimed_max_rating_index {
                found_best = true;
            }
        }
    }
    assert(found_worst, "No bond at claimed worst rating");
    assert(found_best, "No bond at claimed best rating");

    // --- 6. Max single exposure ---
    for i in 0..8 {
        assert(weights_bps[i] <= claimed_max_single_exposure_bps, "Single exposure exceeded");
    }

    // Tightness: at least one active bond at max exposure
    let mut found_max_exp: bool = false;
    for i in 0..8 {
        if amounts[i] > 0 {
            if weights_bps[i] == claimed_max_single_exposure_bps {
                found_max_exp = true;
            }
        }
    }
    assert(found_max_exp, "No bond at claimed max exposure");

    // --- 7. Diversification score (HHI-based) ---
    // HHI = sum(w_i^2) / 10000^2
    // score = 10 - floor(sum(w_i^2) / 10_000_000)
    let mut hhi_scaled: u64 = 0;
    for i in 0..8 {
        hhi_scaled += weights_bps[i] * weights_bps[i];
    }
    let hhi_floor: u64 = hhi_scaled / 10_000_000;
    let computed_score: u8 = if hhi_floor >= 10 { 0 } else { (10 - hhi_floor) as u8 };
    assert(computed_score == claimed_diversification_score, "Diversification score mismatch");

    // --- 8. Zero-padded slots must be fully zero ---
    for i in 0..8 {
        if amounts[i] == 0 {
            assert(weights_bps[i] == 0, "Inactive slot must have zero weight");
            assert(coupon_rates_bps[i] == 0, "Inactive slot must have zero coupon");
            assert(rating_indices[i] == 0, "Inactive slot must have zero rating");
        }
    }
}
