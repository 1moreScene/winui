//! NumberBox expression core, ported from the pinned NumberBoxParser.cpp.
//! Scene NumberBox calls this grammar with the host-derived decimal parser.
#[derive(Clone, Copy)]
enum Token {
    Number(f64),
    Operator(char),
    Open,
    Close,
}
fn precedence(op: char) -> u8 {
    match op {
        '^' => 2,
        '*' | '/' => 1,
        _ => 0,
    }
}
/// Evaluate NumberBox arithmetic with invariant decimal parsing.
/// Powers associate left, as in the native shunting-yard implementation.
/// Invalid syntax returns `None`; division by zero returns `Some(NaN)`.
pub fn evaluate(expression: &str) -> Option<f64> {
    evaluate_with(expression, |text| text.parse().ok())
}
/// Use a host-provided number parser, corresponding to native INumberParser.
/// The host owns locale-specific digits and separators; Rust owns expression syntax.
pub fn evaluate_with(expression: &str, parse_number: impl Fn(&str) -> Option<f64>) -> Option<f64> {
    let mut tokens = Vec::new();
    let mut expect_number = true;
    let mut cursor = 0;
    while cursor < expression.len() {
        let ch = expression[cursor..].chars().next()?;
        if ch == ' ' {
            cursor += 1;
            continue;
        }
        if expect_number {
            if ch == '(' {
                tokens.push(Token::Open);
                cursor += 1;
                continue;
            }
            let start = cursor;
            if ch == '-' {
                cursor += 1;
            }
            let digits_start = cursor;
            while cursor < expression.len() {
                let c = expression[cursor..].chars().next()?;
                if "+-*/^()".contains(c) || c.is_whitespace() {
                    break;
                }
                cursor += c.len_utf8();
            }
            if cursor == digits_start {
                return None;
            }
            tokens.push(Token::Number(parse_number(&expression[start..cursor])?));
            expect_number = false;
        } else {
            if "+-*/^".contains(ch) {
                tokens.push(Token::Operator(ch));
                expect_number = true;
            } else if ch == ')' {
                tokens.push(Token::Close);
            } else {
                return None;
            }
            cursor += ch.len_utf8();
        }
    }
    let mut output = Vec::new();
    let mut operators = Vec::new();
    for token in tokens {
        match token {
            Token::Number(_) => output.push(token),
            Token::Operator(op) => {
                while matches!(operators.last(), Some(Token::Operator(top)) if precedence(*top) >= precedence(op))
                {
                    output.push(operators.pop()?);
                }
                operators.push(token);
            }
            Token::Open => operators.push(token),
            Token::Close => loop {
                match operators.pop()? {
                    Token::Open => break,
                    other => output.push(other),
                }
            },
        }
    }
    while let Some(token) = operators.pop() {
        if matches!(token, Token::Open) {
            return None;
        }
        output.push(token);
    }
    let mut stack = Vec::new();
    for token in output {
        match token {
            Token::Number(value) => stack.push(value),
            Token::Operator(op) => {
                let rhs = stack.pop()?;
                let lhs = stack.pop()?;
                stack.push(match op {
                    '+' => lhs + rhs,
                    '-' => lhs - rhs,
                    '*' => lhs * rhs,
                    '/' if rhs == 0. => return Some(f64::NAN),
                    '/' => lhs / rhs,
                    '^' => lhs.powf(rhs),
                    _ => return None,
                });
            }
            _ => return None,
        }
    }
    if stack.len() == 1 {
        stack.pop()
    } else {
        None
    }
}
