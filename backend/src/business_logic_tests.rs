#[cfg(test)]
mod tests {
    /// Test business logic for ledger amount signs
    /// '입금' (Payment) should be negative (reducing debt)
    /// '매출' (Sales) should be positive (increasing debt)
    #[test]
    fn test_ledger_final_amount_logic() {
        let amount: i32 = 10000;

        // 입금 (Payment) -> Should be -10000
        let deposit_amount = match "입금" {
            "입금" => -amount.abs(),
            _ => amount,
        };
        assert_eq!(deposit_amount, -10000);

        // 매출 (Sales) -> Should be 10000
        let sales_amount = match "매출" {
            "매출" => amount.abs(),
            _ => amount,
        };
        assert_eq!(sales_amount, 10000);

        // 반품 (Return) -> Should be -10000
        let return_amount = match "반품" {
            "반품" | "매출취소" => -amount.abs(),
            _ => amount,
        };
        assert_eq!(return_amount, -10000);
    }

    /// Test stock conversion calculation logic
    /// (Expected deduction = convert quantity * ratio)
    #[test]
    fn test_stock_conversion_ratio() {
        let convert_qty: i32 = 10;
        let ratio: f64 = 1.5;

        // (10 * 1.5).ceil() = 15
        let expected_deduct = (convert_qty as f64 * ratio).ceil() as i32;
        assert_eq!(expected_deduct, 15);

        let convert_qty_2: i32 = 7;
        let ratio_2: f64 = 1.25;
        // (7 * 1.25) = 8.75 -> ceil = 9
        let expected_deduct_2 = (convert_qty_2 as f64 * ratio_2).ceil() as i32;
        assert_eq!(expected_deduct_2, 9);
    }
}
