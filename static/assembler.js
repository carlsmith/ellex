/* ASSEMBLER
This file implements and exports the assembler. The pipeline is documented in
`/static/codegen.js`.

Instructions are simple hashes with four properties:

+ `code`: the code name of the instruction (as a string)
+ `mode`: the instruction's addressing mode (as a string)
+ `value`: the numerical address (or `null` if `mode` is implicit`
+ `bytes`: the length in bytes (always `1`, `2` or `3`)

The are nine valid modes: `implicit`, `immediate`, `indexedX`, `indexedY`
`indirect`, `indexedYindirect`, `indexedXindirect`, `indirectindexedX` and
`indirectindexedY`.

Instructions with implicit addressing take up one byte in memory, while those
with immediate addressing take two. Instructions using any other addressing
mode fill three bytes.
*/

const empty = "";
const put = console.log;

const radixes = {bin: 2, oct: 8, dec: 10, hex: 16};

const convert = (value, notation) => parseInt(value, radixes[notation]);

// EXCEPTION HANLDING ROUTINES...

const chuck = function(type, message, token) {

    /* This function takes an error type and message (as strings) and a token
    from the tokenizer, and uses them to interpolate the details into an error
    message that is then thrown as a string (eliminating the stacktrace). */

    throw `Assembly${type}Error[${token.line}:${token.column}] ${message}`;
};

const rejectValue = function(value, token) {

    /* This wraps `chuck`, handling operands that are out of range. */

    chuck("Value", `the operand (${value}) is out of range`, token);
};

const rejectToken = function(token) {

    /* This wraps `chuck`, handling unexpected tokens. */

    chuck("Syntax", `unexpected token (${token.value})`, token);
};

// THE ASSEMBLER...

export const assemble = function * (tokens) {

    /* This generator takes a token generator (from `tokenize`), and yields
    instruction hashes, which each have their code name and addressing mode
    (as strings), the address as a number (or `null` for implied addresses)
    and the length in bytes. They are consumed by the `codegen` generator.

    Thhis function requests tokens as they are required, but stays ahead of
    the current token by one to allow for peeking at the next token.

    The `advance` helper moves everything forwards one token.

    The other helpers (`declarator`, `immediate`, `variable` `indirect` and
    `continuation`) all just check some predicate (making the if-else block
    in the `evaluate` function more readable). */

    const advance = () => [token, next] = [next, tokens.next().value];

    const declarator = token => token.type === "declarator";

    const immediate = token => token.type === "bang";

    const variable = token => token.type === "variable";

    const indirect = token => token.type === "opener";

    const continuation = next => next !== undefined && next.type === "comma";

    const implicit = code => function() {

        /* This helper takes an instruction name and returns a handler for
        parsing implicit operands. It would obviously be redundant, but it
        compliments the `explicit` helper. */

        return {code: code, mode: "implicit", value: null, bytes: 1};
    };

    const explicit = function(code) {

        /* This function takes a code for a CPU instruction that requires an
        operand. The function updates the nonlocal `instructions` hash with a
        handler that can parse explicit operands. */

        instructions[code] = function evaluate(notation="hex", mode="direct") {

            /* This function recursively consumes one operand (an address)
            that is expressed using one of a set of grammars. It converts the
            address to a number, finds its addressing mode, and checks that
            the result is in range for the mode, returning it if so. */

            const finalize = function(value) {

                /* This helper finalizes everything, checking the operand is
                within range, before returning the instruction that is then
                returned by the outer `evaluate` function. */

                const bytes = mode === "immediate" ? 2 : 3;

                if (value > 65535 || (mode === "immediate" && value > 255)) {

                    rejectValue(value, token);

                } else return {code, mode, value, bytes};
            };

            let operand, value;

            advance();

            if (declarator(token)) return evaluate(token.value, mode);

            if (immediate(token)) return evaluate(notation, "immediate");

            if (variable(token)) value = variables[token.value];

            else if (indirect(token)) {

                operand = evaluate(notation, mode);
                advance("closer");

                if (operand.mode === "direct") mode = "indirect";
                else mode = `${operand.mode}indirect`;

                value = operand.value;

            } else value = convert(token.value, notation);

            if (continuation(next)) {

                advance("comma"); advance("index");

                if (mode === "direct") mode = "indexed" + token.value;
                else mode += "indexed" + token.value;
            }

            return finalize(value);
        };
    };

    // LOCAL CONSTANTS AND VARIABLES...

    const variables = Object.create(null);
    const instructions = Object.create(null);

    let token, name, operator, instruction, notation;

    let next = tokens.next().value;
    let offset = 0;

    // REGISTER THE INSTRUCTIONS, CODE NAMES AND GRAMMARS...

    implicit("AOA");
    explicit("TMA");
    explicit("TAM");
    explicit("TMX");
    explicit("TXA");

    // RUN THE MAIN LOOP UNTIL THE TOKENS ARE EXHUSTED...

    while (advance() && token) {

        // every iteration expects to handle one complete instruction, which
        // will begin with a variable name or an instruction's code name...

        if (token.type === "variable") {

            // get the name and advance to the operator...

            name = token.value;
            advance("label", "let");

            // variable names are followed by a suffix label operator or an
            // infix let operator...

            if (token.type === "label") variables[name] = offset;

            else if (token.type === "let") {

                // assignments have a numerical operand, optionally prefixed
                // by a radix declarator...

                advance("declarator", "number");

                if (token.type === "declarator") {

                    notation = token.value;
                    advance("number");

                } else notation = "hex";

                variables[name] = convert(token.value, notation);

            } else rejectToken(token);

        } else if (token.type === "code") {

            // instruction codes are optionally followed by an address that
            // can use a range of grammars, so instruction handlers are used
            // to gather up and classify the address...

            instruction = instructions[token.value]();
            offset += instruction.bytes;

            yield instruction;

        } else rejectToken(token);
    }
};
