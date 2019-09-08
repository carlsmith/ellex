/* TOKENIZER
This file implements and exports the tokenizer. The pipeline is documented in
`/static/codegen.js`.

Tokens are simple hashes with the usual `type` and `value` properties (both
strings), and `line` and `column` numbers to note their positions. */

const [empty, space, pound, bang, newline] = ["", " ", "#", "!", "\n"];
const [opener, closer, comma, colon, equals] = ["[", "]", ",", ":", "="];

const decimals = "0123456789";
const hexidecimals = decimals + "ABCDEF";
const uppers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const lowers = uppers.toLowerCase();
const letters = uppers + lowers;
const capitals = uppers + decimals;

const whitespace = [space, newline];
const insignificants = [space, newline, pound];
const instructions = ["TMA", "AOA", "TMX", "TAM", "TXA"];
const declarators = ["bin", "oct", "dec", "hex"];

const iife = lambda => lambda();

export const tokenize = function * (source) {

    /* This generator function takes a string of source code as its only arg,
    and yields tokens, one at a time, removing comments and other content
    that is insignificant to the assembler. */

    const advance = function() {

        /* This helper increments the (nonlocal) `index` to index the next
        character in the source, updating the (also nonlocal) `character`
        variable, which it also returns for convenience. */

        return character = source[index++]
    };

    const nextCharacter = function() {

        /* This helper just returns the next character in the source, without
        advancing the state. */

        return source[index];
    };

    const gatherWhile = function(predicate) {

        /* This helper takes a function to use as a predicate for gathering
        up characters within a token. The helper takes characters and appends
        them to the current value until it either runs out of source code or
        the predicate invocation (made ahead of each call to `advance`) is
        falsey. */

        do { value += character } while (predicate() && advance());
    };

    const chuck = function(message) {

        /* This throws a simple exception (without a stacktrace), which is
        logged to the console. */

        throw `AssemblySyntaxError[${line}:${column}]: ${message}`;
    };

    const numerical = iife(function() {

        /* This IIFE defines a helper function that checks that its first arg
        (a single-digit string) is a valid digit and that its second arg is
        true.
        
        The IIFE then defines and returns a function that encloses the helper,
        and uses it to reduce a string of digits to a bool that indicates
        whether the digits form valid hexidecimal number. */

        const digital = (x, y) => hexidecimals.includes(x) && y;

        return address => Array.from(address).reduce(digital);
    });

    let [character, value, type] = [empty, empty, empty];
    let [line, column, index, lines, lineStart] = [0, 0, 0, 0, 0];

    while (advance()) {

        // check for conditions that do not yield a token...

        if (insignificants.includes(character)) {

            if (character === pound) gatherWhile($ => character !== newline);

            if (character !== space) [lineStart, lines] = [index, lines + 1];

            continue;
        }

        // check for conditions that yield a single-character token...

        [line, column, value] = [lines + 1, index - lineStart, empty];

        if (character === opener) [type, value] = ["opener", character];

        else if (character === closer) [type, value] = ["closer", character];

        else if (character === comma) [type, value] = ["comma", character];

        else if (character === bang) [type, value] = ["bang", character];

        else if (character === colon) [type, value] = ["label", character];

        else if (character === equals) [type, value] = ["let", character];

        // check for conditions that yield a multi-character token...

        else if (lowers.includes(character)) {

            gatherWhile($ => letters.includes(nextCharacter()));

            if (declarators.includes(value)) type = "declarator";
            else type = "variable";

        } else if (capitals.includes(character)) {

            gatherWhile($ =>  capitals.includes(nextCharacter()));

            if (value === "X" || value === "Y") type = "index";
            else if (instructions.includes(value)) type = "code";
            else if (numerical(value)) type = "number";
            else chuck(`invalid token (${value})`);

        } else chuck(`unexpected character (${character})`);

        // yield the actual token...

        yield {type, value, line, column};
    }
};
