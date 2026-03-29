// Bond Rating Integrity Proof
// ===========================
// Proves the AI agent's published rating and risk score for a bond
// correctly derive from the private bond metadata on the Privacy Node.
// The AI reviews private data (coupon, maturity, collateral, seniority)
// and publishes a rating + risk score. This proof verifies honesty.
//
// Rating rules (deterministic, verifiable):
//   - couponBps < 300 AND hasCollateral AND seniorityIndex <= 1 => AAA-AA range (0-3)
//   - couponBps < 600 AND (hasCollateral OR seniorityIndex <= 1) => A-BBB range (4-9)
//   - couponBps < 1000 => BB range (10-12)
//   - else => B-CCC range (13-16)
//
// Risk score = base_from_rating + coupon_penalty + maturity_penalty - collateral_bonus

fn main(
    // Private: actual bond metadata from Privacy Node
    coupon_rate_bps: u64,
    maturity_months: u64,
    has_collateral: bool,
    seniority_index: u8,    // 0=senior secured, 1=senior unsecured, 2=subordinated, 3=junior

    // Public: what the AI published
    published_rating_index: pub u8,   // 0=AAA ... 16=CCC
    published_risk_score: pub u8,     // 0-100
    published_has_collateral: pub bool,
    published_coupon_range: pub u8,   // 0="0-3%", 1="3-6%", 2="6-10%", 3="10%+"
) {
    // --- 1. Verify collateral disclosure is honest ---
    assert(has_collateral == published_has_collateral, "Collateral disclosure mismatch");

    // --- 2. Verify coupon range bucketing is correct ---
    let computed_coupon_range: u8 = if coupon_rate_bps < 300 {
        0 // 0-3%
    } else if coupon_rate_bps < 600 {
        1 // 3-6%
    } else if coupon_rate_bps < 1000 {
        2 // 6-10%
    } else {
        3 // 10%+
    };
    assert(computed_coupon_range == published_coupon_range, "Coupon range mismatch");

    // --- 3. Verify rating is in the correct band ---
    // Determine valid rating band from private data
    let is_high_quality = (coupon_rate_bps < 300) & (has_collateral) & (seniority_index <= 1);
    let is_mid_quality = (coupon_rate_bps < 600) & ((has_collateral) | (seniority_index <= 1));
    let is_speculative = coupon_rate_bps < 1000;

    if is_high_quality {
        // AAA to AA- range: indices 0-3
        assert(published_rating_index <= 3, "Rating too low for high-quality bond");
    } else if is_mid_quality {
        // A+ to BBB- range: indices 4-9
        assert(published_rating_index >= 4, "Rating too high for mid-quality bond");
        assert(published_rating_index <= 9, "Rating too low for mid-quality bond");
    } else if is_speculative {
        // BB+ to BB- range: indices 10-12
        assert(published_rating_index >= 10, "Rating too high for speculative bond");
        assert(published_rating_index <= 12, "Rating too low for speculative bond");
    } else {
        // B+ to CCC range: indices 13-16
        assert(published_rating_index >= 13, "Rating too high for high-yield bond");
    }

    // --- 4. Verify risk score is in valid range ---
    // Base risk from rating band
    let base_risk: u8 = if is_high_quality {
        10
    } else if is_mid_quality {
        25
    } else if is_speculative {
        45
    } else {
        65
    };

    // Coupon penalty: higher coupon = higher risk (+0 to +15)
    let coupon_penalty: u8 = if coupon_rate_bps < 200 {
        0
    } else if coupon_rate_bps < 400 {
        5
    } else if coupon_rate_bps < 700 {
        10
    } else {
        15
    };

    // Maturity penalty: longer maturity = higher risk (+0 to +15)
    let maturity_penalty: u8 = if maturity_months < 24 {
        0
    } else if maturity_months < 60 {
        5
    } else if maturity_months < 120 {
        10
    } else {
        15
    };

    // Collateral bonus
    let collateral_bonus: u8 = if has_collateral { 10 } else { 0 };

    let computed_risk = base_risk + coupon_penalty + maturity_penalty - collateral_bonus;

    // Allow +/- 5 tolerance (AI has some discretion within band)
    let min_risk: u8 = if computed_risk >= 5 { computed_risk - 5 } else { 0 };
    let max_risk: u8 = if computed_risk + 5 <= 100 { computed_risk + 5 } else { 100 };

    assert(published_risk_score >= min_risk, "Risk score too low for bond profile");
    assert(published_risk_score <= max_risk, "Risk score too high for bond profile");
}
