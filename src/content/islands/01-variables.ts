import type { Island } from "../../engine/types";
import { INTEGER_TYPES, rs } from "../helpers";

export const variablesIsland: Island = {
  id: "variables",
  number: 1,
  name: "Mutable Marsh",
  topic: "Variables",
  rustBook: "https://doc.rust-lang.org/book/ch03-01-variables-and-mutability.html",
  stages: [
    {
      id: "harbor",
      title: "The Harbor: your first program",
      tutorial: [
        {
          audience: "all",
          title: "Welcome aboard!",
          text:
            "Ahoy! I'm **Ferris**, the Rust crab. Together we'll sail from island to island, and each island teaches one part of the Rust language.\n\n" +
            "Every stage starts with a short lesson like this one, followed by a few puzzles. At the end of each island a **boss** waits: a broken Rust program that you fix in a real code editor, checked by the real Rust compiler.",
        },
        {
          audience: "beginner",
          title: "What is a program?",
          text:
            "A program is a list of instructions for the computer. The computer follows them **in order**, from top to bottom.\n\n" +
            "Rust is a **compiled** language: before your program runs, a tool called the **compiler** reads all of it and checks it for mistakes. If it finds one, it refuses to build the program and explains what's wrong. Rust's compiler is famously helpful, so learning to read its messages is a superpower.",
        },
        {
          audience: "all",
          title: "Hello, Rust!",
          text:
            "Every Rust program starts running at a function called `main`. `fn main() { ... }` defines it, and the curly braces `{ }` hold the instructions to run.\n\n" +
            "`println!` prints a line of text. The `!` means it's a **macro**, a special kind of command. For now, just remember that `println!` always needs its `!`.\n\n" +
            "Each instruction ends with a semicolon `;`. Press **Run it yourself** to compile this program on the Rust Playground, then try changing the text.",
          code: rs`
            fn main() {
                println!("Hello, Rust!");
            }
          `,
          runnable: true,
        },
        {
          audience: "all",
          title: "Printing values",
          text:
            "Inside the text, `{}` is a **placeholder**. Rust replaces it with the value that comes after the comma.\n\n" +
            "You can use several placeholders: they're filled in order, so `println!(\"{} and {}\", 1, 2)` prints `1 and 2`.",
          code: rs`
            fn main() {
                println!("1 + 2 = {}", 1 + 2);
                println!("{} and {}", "Ferris", "friends");
            }
          `,
          runnable: true,
        },
        {
          audience: "experienced",
          title: "Coming from another language",
          text:
            "`println!` is Rust's `print()` / `console.log` / `System.out.println`. The `!` marks a **macro**: it's expanded at compile time, which is how Rust checks that the number of `{}` placeholders matches the number of values. A mismatch is a compile error, not a runtime surprise.\n\n" +
            "There's no top-level script code in Rust: everything runs inside `fn main`.",
        },
      ],
      puzzles: [
        {
          type: "fillGap",
          id: "harbor-bang",
          prompt: "Fill the gap so this program prints a greeting.",
          code: rs`
            fn main() {
                println___("Ahoy, Rustacean!");
            }
          `,
          answers: [["!"]],
          hint: "`println` is a macro. What symbol do macros always have after their name?",
          explanation: "Macros like `println!` are always called with a `!` after their name.",
        },
        {
          type: "pickFix",
          id: "harbor-pick",
          prompt: "Which program compiles and prints `Hello, world!`?",
          options: [
            { code: rs`
              fn main() {
                  println("Hello, world!");
              }
            `, correct: false },
            { code: rs`
              fn main() {
                  println!("Hello, world!");
              }
            `, correct: true },
            { code: rs`
              fn main() {
                  println!(Hello, world!);
              }
            `, correct: false },
          ],
          explanation: "`println!` needs its `!`, and text must be inside double quotes: `\"Hello, world!\"`.",
        },
        {
          type: "predict",
          id: "harbor-predict",
          prompt: "What does this program print?",
          code: rs`
            fn main() {
                println!("{} + {} = {}", 2, 3, 2 + 3);
            }
          `,
          choices: ["2 + 3 = 5", "{} + {} = {}", "5 + 5 = 5", "It doesn't compile"],
          correctIndex: 0,
          explanation: "Each `{}` is replaced, in order, by the values after the text: `2`, `3`, then `2 + 3`, which is `5`.",
        },
      ],
    },
    {
      id: "let-and-mut",
      title: "let and mut",
      tutorial: [
        {
          audience: "beginner",
          title: "What is a variable?",
          text:
            "A **variable** is a name for a value, like a labelled box. You put a value in, then use the name whenever you need it.\n\n" +
            "Without variables you'd have to repeat every value by hand. With them, you write `score` and the computer looks up whatever is stored in it.",
        },
        {
          audience: "all",
          title: "Creating variables with let",
          text:
            "`let` creates a variable: `let coins = 5;` means \"from now on, `coins` is 5\".\n\n" +
            "You can put a variable's name directly inside the braces, like `{coins}`, or use an empty `{}` and pass the value after the comma.\n\n" +
            "Variable names in Rust use **snake_case**: lowercase words joined by underscores, like `gold_coins`.",
          code: rs`
            fn main() {
                let coins = 5;
                println!("I have {coins} coins");
                println!("Double that is {}", coins * 2);
            }
          `,
          runnable: true,
        },
        {
          audience: "all",
          title: "Immutable by default",
          text:
            "In Rust, variables are **immutable** by default: once a value is in the box, it can't be changed. The code below doesn't compile. The compiler says `cannot assign twice to immutable variable`.\n\n" +
            "This is on purpose: when a value can't change, you never have to wonder who changed it.",
          code: rs`
            fn main() {
                let coins = 5;
                coins = 6; // error!
            }
          `,
        },
        {
          audience: "all",
          title: "Making a variable mutable",
          text:
            "Add `mut` (short for **mutable**) after `let`, and you can change the value later.\n\n" +
            "`coins = coins + 3;` reads the old value, adds 3 and stores the result. The shorter `coins += 3;` does the same thing.",
          code: rs`
            fn main() {
                let mut coins = 5;
                println!("Before: {coins}");
                coins = coins + 3;
                println!("After: {coins}");
            }
          `,
          runnable: true,
        },
        {
          audience: "experienced",
          title: "Coming from another language",
          text:
            "Rust's `let` is like `const` in JavaScript or `final` in Java: the variable can't be reassigned. `let mut` is like JavaScript's `let`.\n\n" +
            "One difference: Rust's immutability is deep. Unlike a JavaScript `const` object or a Java `final` object, you also can't change the value's contents through an immutable variable.\n\n" +
            "Make things mutable only when you need to. The compiler even warns you about a `mut` you never use.",
        },
      ],
      puzzles: [
        {
          type: "fillGap",
          id: "let-gap",
          prompt: "Fill the gap to create the variable.",
          code: rs`
            fn main() {
                ___ x = 5;
                println!("x has the value {x}");
            }
          `,
          answers: [["let"]],
          hint: "Which keyword creates a new variable?",
          explanation: "`let` creates a new variable. Without it, Rust thinks you're assigning to a variable that doesn't exist.",
        },
        {
          type: "fillGap",
          id: "mut-gap",
          prompt: "Fill the gap so `count` can be changed.",
          code: rs`
            fn main() {
                let ___ count = 0;
                count += 1;
                println!("{count}");
            }
          `,
          answers: [["mut"]],
          hint: "Which keyword after `let` makes a variable changeable?",
          explanation: "`let mut` creates a mutable variable, so `count += 1` is allowed.",
        },
        {
          type: "predict",
          id: "reassign-predict",
          prompt: "What happens when you compile and run this program?",
          code: rs`
            fn main() {
                let x = 5;
                x = 6;
                println!("{x}");
            }
          `,
          choices: ["It prints 5", "It prints 6", "It doesn't compile"],
          correctIndex: 2,
          explanation: "`x` was declared without `mut`, so `x = 6;` is a compile error: cannot assign twice to immutable variable.",
        },
        {
          type: "spotBug",
          id: "spot-let",
          prompt: "One line doesn't compile. Click it.",
          code: rs`
            fn main() {
                let mut lives = 3;
                lives = lives - 1;
                let score = 10;
                score = score + 5;
                println!("{lives} {score}");
            }
          `,
          bugLine: 5,
          explanation: "`score` was created with plain `let`, so it can't be changed. `lives` is fine because it's `let mut`.",
        },
      ],
    },
    {
      id: "shadowing",
      title: "Shadowing",
      tutorial: [
        {
          audience: "all",
          title: "Reusing a name",
          text:
            "You can declare a **new** variable with the same name as an old one. The new one **shadows** the old one: from that line on, the name refers to the new value.\n\n" +
            "This isn't the same as `mut`. Each `let` creates a brand-new variable; the old one is just hidden.",
          code: rs`
            fn main() {
                let level = 1;
                let level = level + 1;
                let level = level * 10;
                println!("level is {level}");
            }
          `,
          runnable: true,
        },
        {
          audience: "all",
          title: "Shadowing can change the type",
          text:
            "Because shadowing creates a new variable, the new one can hold a different **kind** of value. Here `spaces` starts as some text and becomes a number: `.len()` gives the length of the text.\n\n" +
            "With `mut` you couldn't do this: a mutable variable can change its value, but never its kind.",
          code: rs`
            fn main() {
                let spaces = "   ";
                let spaces = spaces.len();
                println!("There are {spaces} spaces");
            }
          `,
          runnable: true,
        },
        {
          audience: "experienced",
          title: "Coming from another language",
          text:
            "Most languages forbid redeclaring a variable in the same scope. Rust allows it on purpose: it's idiomatic for transforming a value step by step (`let input = input.trim();`) without inventing names like `input2`.",
        },
      ],
      puzzles: [
        {
          type: "predict",
          id: "shadow-predict",
          prompt: "What does this program print?",
          code: rs`
            fn main() {
                let x = 5;
                let x = x + 1;
                let x = x * 2;
                println!("{x}");
            }
          `,
          choices: ["5", "6", "12", "It doesn't compile"],
          correctIndex: 2,
          explanation: "Each `let` shadows the previous `x`: 5, then 5 + 1 = 6, then 6 * 2 = 12.",
        },
        {
          type: "pickFix",
          id: "shadow-pick",
          prompt: "We want `name` to end up holding the length of the text. Which version compiles?",
          options: [
            { code: rs`
              let mut name = "Ferris";
              name = name.len();
            `, correct: false },
            { code: rs`
              let name = "Ferris";
              let name = name.len();
            `, correct: true },
            { code: rs`
              let name = "Ferris";
              name = name.len();
            `, correct: false },
          ],
          explanation: "Only shadowing with a second `let` can change the kind of value. A `mut` variable can change its value, but it must stay the same type.",
        },
        {
          type: "fillGap",
          id: "shadow-gap",
          prompt: "Fill the gap so the number shadows the text.",
          code: rs`
            fn main() {
                let number = "T-H-R-E-E";
                println!("Spell a number: {number}");
                ___ number = 3;
                println!("Number plus two is: {}", number + 2);
            }
          `,
          answers: [["let"]],
          hint: "To shadow a variable, you declare it again.",
          explanation: "`let number = 3;` creates a new variable that shadows the text one, so `number + 2` works.",
        },
      ],
    },
    {
      id: "types",
      title: "Types and annotations",
      tutorial: [
        {
          audience: "beginner",
          title: "Values have types",
          text:
            "Every value has a **type** that says what kind of value it is: a whole number, a number with a decimal point, true or false, a piece of text...\n\n" +
            "The type decides what you can do with a value. You can multiply two numbers, but multiplying two pieces of text makes no sense, so Rust won't let you.",
        },
        {
          audience: "all",
          title: "Common types",
          text:
            "You can write a variable's type after its name with a colon. This is a **type annotation**.\n\n" +
            "`i32` is a whole number that can be negative (`u32` is one that can't). `f64` is a number with a decimal point. `bool` is `true` or `false`. `char` is a single character in single quotes. Text in double quotes is a **string**; you'll meet strings properly on a later island.",
          code: rs`
            fn main() {
                let lives: i32 = 3;
                let speed: f64 = 2.5;
                let is_open: bool = true;
                let letter: char = 'R';
                println!("{lives} {speed} {is_open} {letter}");
            }
          `,
          runnable: true,
        },
        {
          audience: "all",
          title: "Type inference",
          text:
            "Most of the time you don't need annotations: Rust **infers** the type from the value. `let lives = 3;` becomes an `i32`, and `let speed = 2.5;` becomes an `f64`.\n\n" +
            "When there's no value to look at, Rust needs your help, and that's when you write the annotation yourself.",
          code: rs`
            let lives = 3;      // i32
            let speed = 2.5;    // f64
            let open = true;    // bool
          `,
        },
        {
          audience: "all",
          title: "Give it a value before you use it",
          text:
            "You can declare a variable before giving it a value, but you **must** give it one before you use it. Rust never lets you read a variable that was never set: there's no `undefined` or random leftover value.\n\n" +
            "The fix here is to give `x` a value: `let x: i32 = 42;`.",
          code: rs`
            fn main() {
                let x: i32;
                println!("{x}"); // error: used before it has a value
            }
          `,
        },
        {
          audience: "experienced",
          title: "Coming from another language",
          text:
            "Rust is statically typed like Java or C++, with inference closer to TypeScript or Kotlin. Integer types state their size: `i8` to `i128` are signed, `u8` to `u128` unsigned, plus `usize` for sizes and indexes.\n\n" +
            "There are no implicit conversions between number types: putting an `i32` into an `i64` variable is a compile error.",
        },
      ],
      puzzles: [
        {
          type: "fillGap",
          id: "type-gap",
          prompt: "Fill the gap with a type that can hold a whole number.",
          code: rs`
            fn main() {
                let age: ___ = 30;
                println!("Ferris is {age} years old");
            }
          `,
          answers: [INTEGER_TYPES],
          hint: "Whole numbers use types like `i32` or `u32`.",
          explanation: "Any integer type works here, for example `i32` or `u32`.",
        },
        {
          type: "predict",
          id: "infer-predict",
          prompt: "What type does Rust infer for `price`?",
          code: rs`let price = 9.99;`,
          choices: ["i32", "f64", "bool", "char"],
          correctIndex: 1,
          explanation: "A number with a decimal point is inferred as `f64` by default.",
        },
        {
          type: "predict",
          id: "uninit-predict",
          prompt: "What happens with this program?",
          code: rs`
            fn main() {
                let x: i32;
                println!("Number {x}");
            }
          `,
          choices: ["It prints Number 0", "It prints Number undefined", "It doesn't compile"],
          correctIndex: 2,
          explanation: "`x` is declared but never given a value. Rust refuses to compile code that reads it: used binding `x` isn't initialized.",
        },
        {
          type: "spotBug",
          id: "type-spot",
          prompt: "One line doesn't compile. Click it.",
          code: rs`
            fn main() {
                let open: bool = true;
                let initial: char = 'F';
                let lives: i32 = 2.5;
                println!("{open} {initial} {lives}");
            }
          `,
          bugLine: 4,
          explanation: "`2.5` isn't a whole number, so it can't go in an `i32`. It would need `f64`.",
        },
      ],
    },
    {
      id: "constants",
      title: "Constants",
      tutorial: [
        {
          audience: "beginner",
          title: "Why constants?",
          text:
            "Constants give a name to a fixed value, like the number of lives in a game. If you write `MAX_LIVES` instead of `3` everywhere, the code explains itself, and if you ever change the rule you only edit one line.",
        },
        {
          audience: "all",
          title: "const",
          text:
            "A **constant** is a value that never changes, ever. You create one with `const` instead of `let`.\n\n" +
            "Constants have two hard rules: they **always** need a type annotation, and they can't be `mut`. By convention their names use `SCREAMING_SNAKE_CASE` (the compiler warns if they don't). They can live outside `main`, so the whole program can use them.",
          code: rs`
            const MAX_LIVES: u32 = 3;

            fn main() {
                println!("You start with {MAX_LIVES} lives");
            }
          `,
          runnable: true,
        },
        {
          audience: "all",
          title: "Readable numbers",
          text: "Big numbers are easier to read with underscores: `100_000` is the same as `100000`. Rust ignores the underscores.",
          code: rs`const SECONDS_PER_DAY: u32 = 86_400;`,
        },
        {
          audience: "experienced",
          title: "Coming from another language",
          text:
            "A Rust `const` is like `static final` in Java or `constexpr` in C++: the value is known at compile time and copied into every place it's used. Unlike `let`, the type annotation is **mandatory**; constants get no inference.",
        },
      ],
      puzzles: [
        {
          type: "fillGap",
          id: "const-gap",
          prompt: "Fill the gap to declare a constant.",
          code: rs`
            ___ MAX_SPEED: u32 = 120;

            fn main() {
                println!("Top speed: {MAX_SPEED}");
            }
          `,
          answers: [["const"]],
          hint: "Which keyword creates a value that never changes?",
          explanation: "`const` declares a constant. `let` isn't allowed outside a function.",
        },
        {
          type: "spotBug",
          id: "const-spot",
          prompt: "One line doesn't compile. Click it.",
          code: rs`
            const NUMBER = 3;

            fn main() {
                println!("Number: {NUMBER}");
            }
          `,
          bugLine: 1,
          explanation: "Constants always need a type annotation: `const NUMBER: i32 = 3;`.",
        },
        {
          type: "predict",
          id: "const-mut",
          prompt: "Does this line compile?",
          code: rs`const mut LIVES: u32 = 3;`,
          choices: ["Yes, `const mut` works like `let mut`", "No, constants can never be mutable"],
          correctIndex: 1,
          explanation: "Constants never change, so `mut` isn't allowed on a `const`.",
        },
      ],
    },
  ],
  boss: {
    name: "The Immutable Golem",
    story:
      "A hulking golem of grey stone blocks the bridge out of the marsh. \"NOTHING HERE MAY CHANGE,\" it rumbles. Break its four runes one at a time to prove you understand variables, mutability and constants, and it will crumble.",
    rounds: [
      {
        title: "The height rune",
        task: "The golem's height is a constant, but this one won't compile. Fix the line marked FIX ME.",
        starter: rs`
          // Leave the fn lines alone: you'll learn about functions on the next island.
          // A last line with no semicolon hands its value back.

          const GOLEM_HEIGHT = 12; // FIX ME: the golem's height is a u32

          fn golem_height() -> u32 {
              GOLEM_HEIGHT
          }

          fn main() {
              println!("The golem is {} blocks tall.", golem_height());
          }
        `,
        tests: rs`
          #[test]
          fn golem_height_is_12() {
              assert_eq!(golem_height(), 12);
          }
        `,
        solution: rs`
          const GOLEM_HEIGHT: u32 = 12;

          fn golem_height() -> u32 {
              GOLEM_HEIGHT
          }

          fn main() {
              println!("The golem is {} blocks tall.", golem_height());
          }
        `,
        hint: "A constant always needs its type written after its name: `const NAME: type = value;`.",
      },
      {
        title: "The toll rune",
        task: "Pay the bridge toll: the coins must go down by the toll. Fix the line marked FIX ME.",
        starter: rs`
          // Leave the fn lines alone: you'll learn about functions on the next island.

          const BRIDGE_TOLL: u32 = 3;

          fn coins_after_bridge() -> u32 {
              let coins = 10;
              coins = coins - BRIDGE_TOLL; // FIX ME
              coins
          }

          fn main() {
              println!("Coins left: {}", coins_after_bridge());
          }
        `,
        tests: rs`
          #[test]
          fn pay_the_toll() {
              assert_eq!(coins_after_bridge(), 7);
          }
        `,
        solution: rs`
          const BRIDGE_TOLL: u32 = 3;

          fn coins_after_bridge() -> u32 {
              let mut coins = 10;
              coins = coins - BRIDGE_TOLL;
              coins
          }

          fn main() {
              println!("Coins left: {}", coins_after_bridge());
          }
        `,
        hint: "`coins` changes after it's created. Which keyword lets a variable change?",
      },
      {
        title: "The counting rune",
        task: "Count the letters on the rune. Fix the line marked FIX ME without changing the text.",
        starter: rs`
          // Leave the fn lines alone: you'll learn about functions on the next island.

          fn rune_count() -> usize {
              let mut runes = "rust!";
              runes = runes.len(); // FIX ME
              runes
          }

          fn main() {
              println!("The rune has {} letters.", rune_count());
          }
        `,
        tests: rs`
          #[test]
          fn count_the_runes() {
              assert_eq!(rune_count(), 5);
          }
        `,
        solution: rs`
          fn rune_count() -> usize {
              let runes = "rust!";
              let runes = runes.len();
              runes
          }

          fn main() {
              println!("The rune has {} letters.", rune_count());
          }
        `,
        hint: "`runes` starts as text and has to become a number. `mut` can't change a variable's type, but a second `let` (shadowing) can.",
      },
      {
        title: "The bridge rune",
        task: "Measure the bridge: it's 20 steps long. Fix the line marked FIX ME.",
        starter: rs`
          // Leave the fn lines alone: you'll learn about functions on the next island.

          fn bridge_length() -> i32 {
              let length: i32; // FIX ME: the bridge is 20 steps long
              length
          }

          fn main() {
              println!("The bridge is {} steps long.", bridge_length());
          }
        `,
        tests: rs`
          #[test]
          fn measure_the_bridge() {
              assert_eq!(bridge_length(), 20);
          }
        `,
        solution: rs`
          fn bridge_length() -> i32 {
              let length: i32 = 20;
              length
          }

          fn main() {
              println!("The bridge is {} steps long.", bridge_length());
          }
        `,
        hint: "`let length: i32;` declares a variable but never gives it a value. Give it the value 20 on that same line.",
      },
    ],
  },
};
