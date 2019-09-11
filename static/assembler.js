/* ASSEMBLER
This file implements and exports the assembler, which is the second of the
three stage assembly process. This stage does the most work, handling the
actual grammar of the language.
*/

import { put, iife, empty } from "/static/tokenizer.js";
import { radixes, constants, instructions } from "/static/data.js";

const convert = (token, notation) => parseInt(token.value, radixes[notation]);

// EXCEPTION HANLDING ROUTINES...

const chuck = function(type, message, token) {

    /* This function takes an error type and message (as strings) and a token
    from the tokenizer, and uses them to interpolate the details into an error
    message that is then thrown as a string (eliminating the stacktrace). */

    throw `Assembly${type}Error[${token.line}:${token.column}] ${message}`;
};

const rejectToken = function(token) {

    /* This wraps `chuck`, handling unexpected tokens. */

    chuck("Syntax", `unexpected token (${token.value})`, token);
};

// THE ASSEMBLER...

export const assemble = function * (tokens) {

    /* This generator takes a token generator (from `tokenize`), and yields
    instruction hashes, which each have their opcode and addressing mode (as
    strings), the address as a number (or `null` for implied addresses) and
    the length in bytes. They are consumed by the `codegen` generator.

    Thhis function requests tokens as they are required, but stays ahead of
    the current token by one to allow for peeking at the next token.

    The `advance` helper moves everything forwards one token.

    The other helpers (`declarator`, `immediate`, `variable` `indirect` and
    `continuation`) all just check some predicate (making the if-else block
    in the `evaluate` function more readable). */

    const advance = () => [token, next] = [next, tokens.next().value];

    const immediate = token => token.type === "bang";
    
    const indirect = token => token.type === "opener";
    
    const variable = token => token.type === "variable";
    
    const constant = token => token.type === "constant";
    
    const declarator = token => token.type === "declarator";

    const continuation = next => next !== undefined && next.type === "comma";

    const implicit = function(opcode, instruction) {
        
        /* This helper registers instructions with implicit operands, also
        enclosing the instruction data. */

        opcodes[opcode] = function() {

            const {line, column} = token;
            const [mode, value, bytes]  = ["implicit", null, 1];

            return {opcode, mode, value, bytes, line, column, instruction};
        };
    };

    const explicit = function(opcode, instruction) {

        /* This function takes an opcode for a CPU instruction that requires
        an operand. The function updates the nonlocal `opcodes` hash with a
        handler for the opcode that can parse explicit operands. */

        opcodes[opcode] = function evaluate(notation="HEX", mode="absolute") {

            /* This function recursively consumes one operand (an address)
            that is expressed using one of a set of grammars. It converts the
            address to a number, finds its addressing mode, and checks that
            the result is in range for the mode, returning it if so. */

            let operand, value;

            advance();
            
            // RECUSIVLY HANDLE (DECLARATOR AND IMMEDIATE) PREFIXES...

            if (declarator(token)) return evaluate(token.value, mode);
            
            if (immediate(token)) return evaluate(notation, "immediate");

            // STORE THE LEXICAL POSITION OF THE START OF THE ADDRESS...

            const { line, column } = token;

            // WITH THE PREFIXES RESOLVED, HANDLE NAMED ADDRESSES HERE...

            if (variable(token)) value = variables[token.value];

            else if (constant(token)) value = constants[token.value];

            // ELSE, (RECURSIVELY) RESOLVE INDIRECT ADDRESSES HERE...

            else if (indirect(token)) {

                operand = evaluate(notation, mode);
                advance("closer");

                if (operand.mode === "absolute") mode = "indirect";
                else mode = `${operand.mode}indirect`;

                value = operand.value;

            // ELSE, RESOLVE REGULAR (NUMERIC) ADDRESSES HERE...

            } else value = convert(token, notation);

            // NOW THE ADDRESS IS RESOLVED, HANDLE ANY INDEXING...

            if (continuation(next)) {

                advance("comma"); advance("index");

                if (mode === "absolute") mode = "indexed" + token.value;
                else mode += "indexed" + token.value;
            }

            // FINALIZE AND RETURN THE (COMPLETE) INSTRUCTION HASH...

            const bytes = mode === "immediate" ? 2 : 3;

            return {opcode, mode, value, bytes, line, column, instruction};
        };
    };

    // LOCAL CONSTANTS AND VARIABLES...

    const opcodes = Object.create(null);
    const variables = Object.create(null);

    let token, name, operator, instruction, notation;

    let next = tokens.next().value;
    let offset = 0;

    // REGISTER THE INSTRUCTIONS (OPCODES AND GRAMMARS)...

    for (let opcode in instructions) {

        const instruction = instructions[opcode];

        if ("implicit" in instruction) implicit(opcode, instruction);
        else explicit(opcode, instruction);
    }

    // RUN THE MAIN LOOP UNTIL THE TOKENS ARE EXHUSTED...

    while (advance() && token) {

        /* Every iteration expects to handle one complete instruction, which
        will begin with a variable name or an opcode. */

        if (token.type === "variable") {

            /* Variable names are followed by a suffix label operator (`:`),
            or an infix let operator (`=`) with an address for its right
            operand. */

            // GET THE NAME, THEN ADVANCE AND HANDLE THE OPERATOR...

            name = token.value;
            advance("label", "let");

            if (token.type === "label") variables[name] = offset;

            else if (token.type === "let") {

                /* Assignments do not use the `evaluate` function to parse
                the address, as assignments always have a simple numerical
                operand (optionally prefixed by a radix declarator), which
                is less than what `evaluate` permits. */

                advance("declarator", "number");

                // CHECK FOR A DECLARATOR, THEN DETERMINE THE RADIX...

                if (token.type === "declarator") {

                    notation = token.value;
                    advance("number");
                    
                } else notation = "HEX";
                
                // RESOLVE THE NOTATION, THEN REGISTER THE VARIABLE...

                variables[name] = convert(token, notation);

            } else rejectToken(token);

        } else if (token.type === "opcode") {

            /* Opcodes are optionally followed by an address that can use a
            range of prefixes and grammars, so instruction handlers are used
            to gather up and classify the address. */

            instruction = opcodes[token.value]();
            offset += instruction.bytes;

            yield instruction;

        } else rejectToken(token);
    }
};
