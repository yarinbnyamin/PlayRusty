import type { Island } from "../../engine/types";
import { INTEGER_TYPES, rs } from "../helpers";

export const functionsIsland: Island = {
  id: "functions",
  number: 2,
  name: "Function Fjord",
  topic: "Functions",
  rustBook: "https://doc.rust-lang.org/book/ch03-03-how-functions-work.html",
  stages: [
    {
      id: "functions-101",
      title: "What is a function?",
      beginnerOnly: true,
      tutorial: [
        {
          audience: "beginner",
          title: "Named recipes",
          text:
            "A **function** is a named block of instructions, like a recipe. You write the recipe once, then **call** it by name whenever you need it.\n\n" +
            "You've already used one: `main` is a function. Rust calls it for you when your program starts.",
        },
        {
          audience: "beginner",
          title: "Define once, call many times",
          text:
            "Here we **define** a function called `cheer`, and `main` **calls** it twice by writing `cheer();`. Each call runs every instruction inside `cheer`, then the program continues where it left off.\n\n" +
            "Defining a function doesn't run it. Only calling it does.",
          code: rs`
            fn main() {
                cheer();
                cheer();
            }

            fn cheer() {
                println!("Hip hip, hooray!");
            }
          `,
          runnable: true,
        },
      ],
      puzzles: [
        {
          type: "predict",
          id: "calls-predict",
          prompt: "How many lines does this program print?",
          code: rs`
            fn main() {
                wave();
                wave();
                wave();
            }

            fn wave() {
                println!("o/");
            }
          `,
          choices: ["0", "1", "3"],
          correctIndex: 2,
          explanation: "`wave` is called three times, and each call prints one line.",
        },
        {
          type: "predict",
          id: "define-predict",
          prompt: "What does this program print?",
          code: rs`
            fn main() {
                println!("Start");
            }

            fn secret() {
                println!("Secret!");
            }
          `,
          choices: ["Start", "Start, then Secret!", "Secret!, then Start"],
          correctIndex: 0,
          explanation: "`secret` is defined but never called, so it never runs. Rust even warns you that it's unused.",
        },
      ],
    },
    {
      id: "defining-functions",
      title: "Defining functions",
      tutorial: [
        {
          audience: "all",
          title: "The fn keyword",
          text:
            "Define a function with `fn`, a name, parentheses `()` and a body in curly braces. Function names use `snake_case`, like variables.\n\n" +
            "Call it by writing its name followed by `()` and a semicolon.",
          code: rs`
            fn main() {
                greet();
                println!("Back in main");
            }

            fn greet() {
                println!("Hello from greet!");
            }
          `,
          runnable: true,
        },
        {
          audience: "all",
          title: "Order doesn't matter",
          text:
            "Functions can be defined before or after the code that calls them. Rust reads the whole file before running anything, so `main` can call `greet` even though `greet` is written below it.",
        },
        {
          audience: "experienced",
          title: "Coming from another language",
          text:
            "Rust uses the short keyword `fn`, not `function` or `def`. Functions live at the top level of a file (or inside `impl` blocks, which come later), and their order doesn't matter, unlike Python scripts or C without prototypes.",
        },
      ],
      puzzles: [
        {
          type: "fillGap",
          id: "fn-gap",
          prompt: "Fill the gap to define the function.",
          code: rs`
            fn main() {
                call_me();
            }

            ___ call_me() {
                println!("Ring ring!");
            }
          `,
          answers: [["fn"]],
          hint: "Which short keyword starts a function definition?",
          explanation: "Functions are defined with `fn`.",
        },
        {
          type: "spotBug",
          id: "fn-spot",
          prompt: "One line doesn't compile. Click it.",
          code: rs`
            fn main() {
                greet();
            }

            function greet() {
                println!("Hi!");
            }
          `,
          bugLine: 5,
          explanation: "Rust's keyword is `fn`, not `function`.",
        },
        {
          type: "pickFix",
          id: "call-pick",
          prompt: "Which line inside `main` actually calls the function `say_hi`?",
          options: [
            { code: rs`say_hi;`, correct: false },
            { code: rs`call say_hi();`, correct: false },
            { code: rs`say_hi();`, correct: true },
          ],
          explanation: "Calling a function needs parentheses: `say_hi();`. Without them, `say_hi;` only names the function and does nothing.",
        },
      ],
    },
    {
      id: "parameters",
      title: "Parameters",
      tutorial: [
        {
          audience: "beginner",
          title: "Giving a function input",
          text:
            "Functions get more useful when you can hand them information. These inputs are called **parameters**. A recipe that says \"bake for N minutes\" is more flexible than one that always says 20.",
        },
        {
          audience: "all",
          title: "Parameters have types",
          text:
            "Parameters go inside the parentheses as `name: type`. In Rust the type is **required** for every parameter: `fn print_coins(amount: u32)`.\n\n" +
            "When you call the function, you pass a value for each parameter: `print_coins(5)`. Inside the function, `amount` is a normal variable holding that value.",
          code: rs`
            fn main() {
                print_coins(5);
                print_coins(12);
            }

            fn print_coins(amount: u32) {
                println!("You have {amount} coins");
            }
          `,
          runnable: true,
        },
        {
          audience: "all",
          title: "Several parameters",
          text: "Separate parameters with commas, and give each one its own type. When calling, pass the values in the same order.",
          code: rs`
            fn main() {
                print_total(3, 4);
            }

            fn print_total(a: i32, b: i32) {
                println!("{a} + {b} = {}", a + b);
            }
          `,
          runnable: true,
        },
        {
          audience: "experienced",
          title: "Coming from another language",
          text:
            "Local variables get type inference, but function signatures never do: every parameter type (and the return type, next stage) is written explicitly. That keeps signatures reliable as documentation. There are no default parameters, optional parameters or overloading.",
        },
      ],
      puzzles: [
        {
          type: "fillGap",
          id: "param-gap",
          prompt: "Fill the gap with the parameter's type.",
          code: rs`
            fn main() {
                call_me(3);
            }

            fn call_me(num: ___) {
                println!("Ring! Call number {num}");
            }
          `,
          answers: [INTEGER_TYPES],
          hint: "Every parameter needs a type, and `3` is a whole number.",
          explanation: "Parameters must have a type annotation, for example `num: i32` or `num: u8`.",
        },
        {
          type: "pickFix",
          id: "arg-pick",
          prompt: "`fn call_me(num: u8)` takes one number. Which call compiles?",
          options: [
            { code: rs`call_me();`, correct: false },
            { code: rs`call_me(3);`, correct: true },
            { code: rs`call_me("3");`, correct: false },
          ],
          explanation: "You must pass exactly one value of the right type. `\"3\"` is text, not a number.",
        },
        {
          type: "spotBug",
          id: "param-spot",
          prompt: "One line doesn't compile. Click it.",
          code: rs`
            fn main() {
                add(1, 2);
            }

            fn add(a, b: i32) {
                println!("{}", a + b);
            }
          `,
          bugLine: 5,
          explanation: "Every parameter needs its own type: `fn add(a: i32, b: i32)`.",
        },
      ],
    },
    {
      id: "return-values",
      title: "Return values",
      tutorial: [
        {
          audience: "beginner",
          title: "Getting an answer back",
          text:
            "Some functions just do something, like printing. Others **compute** something and hand the result back to the caller. That result is the function's **return value**.",
        },
        {
          audience: "all",
          title: "The -> arrow",
          text:
            "Write the return type after an arrow: `-> i32`.\n\n" +
            "The last line of the body, `n * n`, has **no semicolon**. That makes it the value the function returns. You can store the result in a variable or use it directly.",
          code: rs`
            fn main() {
                let result = square(4);
                println!("4 squared is {result}");
            }

            fn square(n: i32) -> i32 {
                n * n
            }
          `,
          runnable: true,
        },
        {
          audience: "all",
          title: "Statements and expressions",
          text:
            "Rust separates **expressions**, which produce a value (`n * n`, `5`, `square(3)`), from **statements**, which just do something (`let x = 5;`).\n\n" +
            "Adding a semicolon turns an expression into a statement and throws its value away. So with `n * n;` the function returns nothing, and the compiler complains about `mismatched types`. This is one of the most common beginner mistakes!",
          code: rs`
            fn square(n: i32) -> i32 {
                n * n; // error: the semicolon throws the value away
            }
          `,
        },
        {
          audience: "all",
          title: "The return keyword",
          text:
            "You can also return with the `return` keyword: `return 42;`. It's mainly used to leave a function early. At the end of a function, Rust programmers usually just write the final expression without `return`.",
          code: rs`
            fn answer() -> i32 {
                return 42;
            }
          `,
        },
        {
          audience: "experienced",
          title: "Coming from another language",
          text:
            "Rust is expression-oriented: a block `{ ... }` evaluates to its last expression, so the final expression of a function body is its return value. A function without `->` returns `()`, the empty \"unit\" type, similar to `void`. Watch the trailing `;`: it's the difference between returning a value and returning `()`.",
        },
      ],
      puzzles: [
        {
          type: "fillGap",
          id: "arrow-gap",
          prompt: "Fill the gap so the function returns an `i32`.",
          code: rs`
            fn main() {
                println!("{}", double(21));
            }

            fn double(n: i32) ___ i32 {
                n * 2
            }
          `,
          answers: [["->"]],
          hint: "The return type comes after a small arrow made of two characters.",
          explanation: "`-> i32` declares that the function returns an `i32`.",
        },
        {
          type: "predict",
          id: "semicolon-predict",
          prompt: "What happens with this program?",
          code: rs`
            fn square(num: i32) -> i32 {
                num * num;
            }

            fn main() {
                println!("{}", square(3));
            }
          `,
          choices: ["It prints 9", "It prints 0", "It doesn't compile"],
          correctIndex: 2,
          explanation: "The semicolon after `num * num` turns it into a statement, so the function returns `()` instead of an `i32`: mismatched types.",
        },
        {
          type: "spotBug",
          id: "return-spot",
          prompt: "One line causes the compile error. Click it.",
          code: rs`
            fn main() {
                let total = add_tax(100);
                println!("{total}");
            }

            fn add_tax(price: u32) {
                price + price / 10
            }
          `,
          bugLine: 6,
          explanation: "The function produces a value but declares no return type. It needs `-> u32` after the parameters.",
        },
      ],
    },
  ],
  boss: {
    name: "The Signature Sphinx",
    story:
      "On a cliff above the fjord sits the Signature Sphinx. \"Answer my four riddles,\" it purrs, \"and you may sail on.\" Each riddle is a function, and each one is wrong.",
    starter: rs`
      // Fix each riddle so the program compiles and all four tests pass.

      // Riddle 1: return twice the number of legs.
      fn riddle_one(legs: u32) -> u32 {
          legs * 2;
      }

      // Riddle 2: return the sum of a and b.
      fn riddle_two(a: i32, b) -> i32 {
          a + b
      }

      // Riddle 3: return the number 42.
      fn riddle_three() {
          42
      }

      // Riddle 4: write a function named riddle_four that takes no
      // parameters and returns the u32 number 7. It doesn't exist yet!

      fn main() {
          println!("The Sphinx is waiting...");
      }
    `,
    tests: rs`
      #[test]
      fn riddle_one_doubles() {
          assert_eq!(riddle_one(4), 8);
      }

      #[test]
      fn riddle_two_adds() {
          assert_eq!(riddle_two(2, 3), 5);
      }

      #[test]
      fn riddle_three_is_42() {
          assert_eq!(riddle_three(), 42);
      }

      #[test]
      fn riddle_four_is_7() {
          assert_eq!(riddle_four(), 7);
      }
    `,
    solution: rs`
      fn riddle_one(legs: u32) -> u32 {
          legs * 2
      }

      fn riddle_two(a: i32, b: i32) -> i32 {
          a + b
      }

      fn riddle_three() -> i32 {
          42
      }

      fn riddle_four() -> u32 {
          7
      }

      fn main() {
          println!("The Sphinx is waiting...");
      }
    `,
    hints: [
      "Riddle 1: look at the last line of the body. What does a semicolon do to a value?",
      "Riddle 2: every parameter needs a type. Riddle 3: a function that returns a value needs `-> type`.",
      "Riddle 4: write a new function from scratch: `fn riddle_four() -> u32 { ... }` with `7` as its last expression.",
    ],
  },
};
