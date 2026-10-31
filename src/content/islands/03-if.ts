import type { Island } from "../../engine/types";
import { rs } from "../helpers";

export const ifIsland: Island = {
  id: "if",
  number: 3,
  name: "Branching Bay",
  topic: "If",
  rustBook: "https://doc.rust-lang.org/book/ch03-05-control-flow.html",
  stages: [
    {
      id: "if-else",
      title: "if and else",
      tutorial: [
        {
          audience: "beginner",
          title: "Making decisions",
          text:
            "Programs often need to choose: if the player has a key, open the door; otherwise, keep it shut. That's what `if` does: it checks a **condition**, a question whose answer is `true` or `false`, and runs code only when the answer is `true`.\n\n" +
            "`else` adds a second path for when the answer is `false`.",
        },
        {
          audience: "all",
          title: "if / else in Rust",
          text:
            "Write `if`, then the condition, then the code to run in curly braces. The `else` block runs when the condition is `false`. Try changing `tide` to `3` and run it again.",
          code: rs`
            fn main() {
                let tide = 7;
                if tide > 5 {
                    println!("High tide: the ship can sail!");
                } else {
                    println!("Low tide: wait a while.");
                }
            }
          `,
          runnable: true,
        },
        {
          audience: "all",
          title: "Comparing values",
          text:
            "Conditions usually compare values. `==` checks \"equal\" (two `=` signs; a single `=` is assignment), `!=` is \"not equal\", and `<`, `>`, `<=`, `>=` compare sizes.\n\n" +
            "Combine conditions with `&&` (and) and `||` (or), and flip one with `!` (not).",
          code: rs`
            fn main() {
                let has_key = true;
                let coins = 12;
                if has_key && coins >= 10 {
                    println!("The door opens.");
                }
            }
          `,
          runnable: true,
        },
        {
          audience: "all",
          title: "Conditions must be bool",
          text:
            "In Rust the condition must be exactly `true` or `false`. A number isn't automatically \"true\" when it isn't zero, so write the comparison you mean: `if fish > 0`.",
          code: rs`
            fn main() {
                let fish = 3;
                if fish { // error: expected bool, found integer
                    println!("Dinner!");
                }
            }
          `,
        },
        {
          audience: "experienced",
          title: "Coming from another language",
          text:
            "There are no parentheses around the condition (they're allowed, but the compiler warns), and braces are **always** required, even for one line. There's no truthiness: `if count`, `if name` or `if list` won't compile, because the condition must be a `bool`.",
        },
      ],
      puzzles: [
        {
          type: "predict",
          id: "if-predict",
          prompt: "What does this program print?",
          code: rs`
            fn main() {
                let n = 7;
                if n > 5 {
                    println!("big");
                } else {
                    println!("small");
                }
            }
          `,
          choices: ["big", "small", "big, then small"],
          correctIndex: 0,
          explanation: "`7 > 5` is `true`, so only the first block runs.",
        },
        {
          type: "pickFix",
          id: "bool-pick",
          prompt: "Which condition compiles and checks that `fish` isn't zero?",
          options: [
            { code: rs`if fish {`, correct: false },
            { code: rs`if fish != 0 {`, correct: true },
            { code: rs`if fish = 0 {`, correct: false },
          ],
          explanation: "The condition must be a `bool`. `fish != 0` compares and gives `true` or `false`; `=` is assignment, not comparison.",
        },
        {
          type: "spotBug",
          id: "eq-spot",
          prompt: "One line doesn't compile. Click it.",
          code: rs`
            fn main() {
                let coins = 3;
                if coins = 3 {
                    println!("Exactly three!");
                }
            }
          `,
          bugLine: 3,
          explanation: "`=` assigns a value. To compare, use `==`: `if coins == 3`.",
        },
        {
          type: "predict",
          id: "and-predict",
          prompt: "What does this program print?",
          code: rs`
            fn main() {
                let has_map = true;
                let has_boat = false;
                if has_map && has_boat {
                    println!("Set sail!");
                } else {
                    println!("Not ready yet.");
                }
            }
          `,
          choices: ["Set sail!", "Not ready yet."],
          correctIndex: 1,
          explanation: "`&&` needs **both** sides to be `true`. `has_boat` is `false`, so the `else` block runs.",
        },
      ],
    },
    {
      id: "else-if",
      title: "else if chains",
      tutorial: [
        {
          audience: "all",
          title: "More than two paths",
          text:
            "Chain extra conditions with `else if`. Rust checks them **from top to bottom** and runs only the **first** block whose condition is `true`; the rest are skipped. The final `else` catches everything else.",
          code: rs`
            fn main() {
                let score = 85;
                if score >= 90 {
                    println!("Grade: A");
                } else if score >= 80 {
                    println!("Grade: B");
                } else {
                    println!("Grade: C");
                }
            }
          `,
          runnable: true,
        },
        {
          audience: "all",
          title: "The remainder operator",
          text:
            "`%` gives the **remainder** of a division: `7 % 3` is `1`, and `10 % 5` is `0`. A number is divisible by `n` when `number % n == 0`, which makes `%` the classic tool for puzzles like FizzBuzz.",
          code: rs`
            fn main() {
                let n = 15;
                if n % 15 == 0 {
                    println!("FizzBuzz");
                } else if n % 3 == 0 {
                    println!("Fizz");
                } else if n % 5 == 0 {
                    println!("Buzz");
                } else {
                    println!("{n}");
                }
            }
          `,
          runnable: true,
        },
        {
          audience: "experienced",
          title: "Coming from another language",
          text:
            "`else if` works as you'd expect. When you find yourself comparing one value against many options, Rust has a more powerful tool called `match`, which you'll meet on Enum Atoll.",
        },
      ],
      puzzles: [
        {
          type: "predict",
          id: "order-predict",
          prompt: "What does this program print?",
          code: rs`
            fn main() {
                let score = 92;
                if score >= 80 {
                    println!("B");
                } else if score >= 90 {
                    println!("A");
                } else {
                    println!("C");
                }
            }
          `,
          choices: ["A", "B", "A and B", "C"],
          correctIndex: 1,
          explanation: "Rust stops at the **first** true condition. `92 >= 80` is true, so it prints B and never checks `>= 90`. Put the most specific check first!",
        },
        {
          type: "fillGap",
          id: "else-if-gap",
          prompt: "Fill the two gaps to add a middle case.",
          code: rs`
            fn main() {
                let temp = 15;
                if temp > 25 {
                    println!("Hot");
                } ___ ___ temp > 10 {
                    println!("Mild");
                } else {
                    println!("Cold");
                }
            }
          `,
          answers: [["else"], ["if"]],
          hint: "You need two keywords: one for \"otherwise\" and one for a new condition.",
          explanation: "`else if` adds another condition to the chain.",
        },
        {
          type: "predict",
          id: "mod-predict",
          prompt: "What value does `r` get?",
          code: rs`let r = 17 % 5;`,
          choices: ["3", "2", "3.4", "0"],
          correctIndex: 1,
          explanation: "17 divided by 5 is 3 with a remainder of 2, so `17 % 5` is `2`.",
        },
      ],
    },
    {
      id: "if-expressions",
      title: "if as an expression",
      tutorial: [
        {
          audience: "all",
          title: "if gives back a value",
          text:
            "In Rust, `if` is an **expression**: it produces a value. Each block's last expression (no semicolon!) is the value of that branch, so you can store the result directly with `let`.\n\n" +
            "Remember expressions from Function Fjord? This is the same idea.",
          code: rs`
            fn main() {
                let tide = 4;
                let status = if tide > 5 { "sail" } else { "wait" };
                println!("Captain says: {status}");
            }
          `,
          runnable: true,
        },
        {
          audience: "all",
          title: "Both branches must match",
          text:
            "Rust needs to know the type of `label` when compiling, so every branch must produce the **same type**. Here one branch gives text and the other a number, which is a compile error: `if` and `else` have incompatible types.",
          code: rs`
            fn main() {
                let n = 3;
                let label = if n > 2 { "many" } else { 0 }; // error
            }
          `,
        },
        {
          audience: "all",
          title: "if as a return value",
          text:
            "Because `if` is an expression, it can be the last expression of a function, and its value becomes the return value. Notice there's no semicolon after `a` or `b`.\n\n" +
            "When `if` produces a value it **needs an `else`**: otherwise there'd be no value when the condition is false, and that's a compile error.",
          code: rs`
            fn bigger(a: i32, b: i32) -> i32 {
                if a > b {
                    a
                } else {
                    b
                }
            }

            fn main() {
                println!("{}", bigger(3, 8));
            }
          `,
          runnable: true,
        },
        {
          audience: "experienced",
          title: "Coming from another language",
          text:
            "This replaces the ternary operator: Rust has no `cond ? a : b`; you write `if cond { a } else { b }`. Since a function body's last expression is its return value, `if`/`else` is often the entire body of a small function.",
        },
      ],
      puzzles: [
        {
          type: "fillGap",
          id: "if-expr-gap",
          prompt: "Fill the gap so `parity` is \"even\" or \"odd\".",
          code: rs`
            fn main() {
                let n = 4;
                let parity = ___ n % 2 == 0 { "even" } else { "odd" };
                println!("{n} is {parity}");
            }
          `,
          answers: [["if"]],
          hint: "`let parity = ...` needs a value. Which keyword can produce one from a condition?",
          explanation: "`if` is an expression, so its result can be stored with `let`.",
        },
        {
          type: "predict",
          id: "types-predict",
          prompt: "What happens with this program?",
          code: rs`
            fn main() {
                let n = 3;
                let label = if n > 2 { "many" } else { 0 };
                println!("{label}");
            }
          `,
          choices: ["It prints many", "It prints 0", "It doesn't compile"],
          correctIndex: 2,
          explanation: "Both branches must have the same type. `\"many\"` is text and `0` is a number, so this is a compile error.",
        },
        {
          type: "spotBug",
          id: "if-semi-spot",
          prompt: "One line breaks this function. Click it.",
          code: rs`
            fn smaller(a: i32, b: i32) -> i32 {
                if a < b {
                    a
                } else {
                    b;
                }
            }
          `,
          bugLine: 5,
          explanation: "The semicolon after `b` throws its value away, so the `else` branch produces `()` instead of an `i32`.",
        },
        {
          type: "pickFix",
          id: "no-else-pick",
          prompt: "Which function compiles?",
          options: [
            { code: rs`
              fn step(n: i32) -> i32 {
                  if n >= 0 { 1 }
              }
            `, correct: false },
            { code: rs`
              fn step(n: i32) -> i32 {
                  if n >= 0 { 1 } else { -1 }
              }
            `, correct: true },
          ],
          explanation: "When `if` produces a value, it needs an `else`. Otherwise there's no value when the condition is false.",
        },
      ],
    },
  ],
  boss: {
    name: "The Fork Kraken",
    story:
      "The water of Branching Bay boils, and the Fork Kraken rises! Each of its four tentacles is a function that has to choose the right path. Fix them one at a time to send it back to the deep.",
    rounds: [
      {
        title: "The tentacle of choice",
        task: "Return the bigger of `a` and `b`.",
        starter: rs`
          fn bigger(a: i32, b: i32) -> i32 {
              // Write an if/else expression here.
          }

          fn main() {
              println!("{}", bigger(10, 8));
          }
        `,
        tests: rs`
          #[test]
          fn bigger_picks_the_first() {
              assert_eq!(bigger(10, 8), 10);
          }

          #[test]
          fn bigger_picks_the_second() {
              assert_eq!(bigger(32, 42), 42);
          }
        `,
        solution: rs`
          fn bigger(a: i32, b: i32) -> i32 {
              if a > b {
                  a
              } else {
                  b
              }
          }

          fn main() {
              println!("{}", bigger(10, 8));
          }
        `,
        hint: "The body is empty, so it gives back nothing. Make an `if a > b { ... } else { ... }` expression the last thing in the body.",
      },
      {
        title: "The tentacle of signs",
        task: "Return 1 for positive numbers, -1 for negative numbers and 0 for zero.",
        starter: rs`
          fn sign(n: i32) -> i32 {
              if n > 0 {
                  1
              } else if n < 0 {
                  -1
              }
          }

          fn main() {
              println!("{}", sign(-3));
          }
        `,
        tests: rs`
          #[test]
          fn sign_handles_all_cases() {
              assert_eq!(sign(5), 1);
              assert_eq!(sign(-3), -1);
              assert_eq!(sign(0), 0);
          }
        `,
        solution: rs`
          fn sign(n: i32) -> i32 {
              if n > 0 {
                  1
              } else if n < 0 {
                  -1
              } else {
                  0
              }
          }

          fn main() {
              println!("{}", sign(-3));
          }
        `,
        hint: "When `if` produces a value, every path needs one. What happens when `n` is 0?",
      },
      {
        title: "The tentacle of luck",
        task: "A number is lucky if it's divisible by 7 or its last digit is 7 (that is, `n % 10 == 7`).",
        starter: rs`
          fn is_lucky(n: u32) -> bool {
              if n % 7 == 0 || n % 10 == 7 {
                  true
              } else {
                  "false"
              }
          }

          fn main() {
              println!("{}", is_lucky(27));
          }
        `,
        tests: rs`
          #[test]
          fn lucky_numbers() {
              assert!(is_lucky(14));
              assert!(is_lucky(27));
              assert!(!is_lucky(10));
          }
        `,
        solution: rs`
          fn is_lucky(n: u32) -> bool {
              if n % 7 == 0 || n % 10 == 7 {
                  true
              } else {
                  false
              }
          }

          fn main() {
              println!("{}", is_lucky(27));
          }
        `,
        hint: "Both branches must have the same type. `\"false\"` in quotes is text, but `false` is a `bool`.",
      },
      {
        title: "The tentacle of speed",
        task: "A ship sails at speed 1 in a storm and speed 3 in calm water. Make `ship_speed` give back the right number.",
        starter: rs`
          fn ship_speed(storm: bool) -> u32 {
              let speed = if storm {
                  1;
              } else {
                  3;
              };
              speed
          }

          fn main() {
              println!("Speed in a storm: {}", ship_speed(true));
          }
        `,
        tests: rs`
          #[test]
          fn ship_speed_matches_the_weather() {
              assert_eq!(ship_speed(true), 1);
              assert_eq!(ship_speed(false), 3);
          }
        `,
        solution: rs`
          fn ship_speed(storm: bool) -> u32 {
              let speed = if storm {
                  1
              } else {
                  3
              };
              speed
          }

          fn main() {
              println!("Speed in a storm: {}", ship_speed(true));
          }
        `,
        hint: "Look inside each branch: a semicolon after a value turns it into a statement, so the branch gives back nothing. The `let` line itself still ends with `;`.",
      },
    ],
  },
};
