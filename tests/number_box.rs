use winui_wasm::number_box::{evaluate, evaluate_with};

#[test]
fn native_number_box_precedence_and_unary_rules() {
    for (input, result) in [
        ("1 + 2*3", 7.),
        ("(1+2)*3", 9.),
        ("2^3^2", 64.),
        ("-2^2", 4.),
        ("2^-3", 0.125),
        ("3--2", 5.),
        ("1-2-3", -4.),
    ] {
        assert_eq!(evaluate(input), Some(result), "{input}");
    }
    for input in [
        "", " ", "1+", "(1+2", "1+2)", "2(3)", "+2", "-(2)", "1 2", "1e-3", "1\t+2",
    ] {
        assert_eq!(evaluate(input), None, "{input}");
    }
    assert!(evaluate("3/0").unwrap().is_nan());
}

#[test]
fn native_number_parser_boundary_accepts_host_locale_without_moving_arithmetic_to_host() {
    assert_eq!(
        evaluate_with("1,5 * (2 + 0,5)", |n| n.replace(',', ".").parse().ok()),
        Some(3.75)
    );
    assert_eq!(evaluate_with("42+1", |_| None), None);
}
