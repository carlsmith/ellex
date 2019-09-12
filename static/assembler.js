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

    The `advance` helper moves everything forwards one token, checking the
    new token belongs to one of the given types.

    The other helpers (`declarator`, `immediate`, `variable` `indirect` and
    `continuation`) all just check some predicate (making the if-else block
    in the `evaluate` function more readable). */

    const advance = function(...types) {
        
        [token, next] = [next, tokens.next().value];

        if (token === undefined) return false;
        if (types.includes(token.type)) return token;
        else rejectToken(token);
    };

    const immediate = token => token.type === "bang";
    
    const indirect = token => token.type === "opener";
    
    const variable = token => token.type === "variable";
    
    const constant = token => token.type === "constant";
    
    const declarator = token => token.type === "declarator";

    const continuation = next => next !== undefined && next.type === "comma";

    const registerImplicit = function(opcode, instruction) {
        
        /* This helper registers instructions with implicit operands, also
        enclosing the instruction data. */

        opcodes[opcode] = function() {

            const {line, column} = token;
            const [mode, value, bytes]  = ["implicit", null, 1];

            return {opcode, mode, value, bytes, line, column, instruction};
        };
    };

    const registerExplicit = function(opcode, instruction) {

        /* This function takes an opcode for a CPU instruction that requires
        an operand. The function updates the nonlocal `opcodes` hash with a
        handler for the opcode that can parse explicit operands. */

        opcodes[opcode] = function evaluate(notation="HEX", mode="absolute") {

            /* This function recursively consumes one operand (an address)
            that is expressed using one of a set of grammars. It converts the
            address to a number, finds its addressing mode, and checks that
            the result is in range for the mode, returning it if so. */

            let operand, value;

            advance("declarator", "number", "variable", "opener", "bang", "constant");

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

    const gatherPreloadData = function() {

        /* This helper wraps `gatherSimpleOperands` in a loop to gather up
        arrays of one or more (bar-seperated) operands. In practice, the
        types are always the same in this context, so are hardcoded. */

        const gatherNextByte = function() {
            
            advance("declarator", "number", "string");
            let value = gatherSimpleOperand();

            return {value: value, line: token.line, column: token.column}
        };

        const output = [gatherNextByte()];

        while (next.type === "cat") {

            advance("cat");
            output.push(gatherNextByte())
        }

        return output;
    };

    const gatherSimpleOperand = function() {

        /* This helper establishes the notation type, then parses and returns
        the value of a simple operand.  */

        let notation = "HEX";

        if (token.type === "declarator") {

            notation = token.value;
            advance("number");
        }

        if (token.type === "variable") return variables[token.value];
        else return convert(token, notation);

        return rvalue;
    };

    const assemblePreload = function(start, token, bytes) {

        const { line, column } = token;
        const size = bytes.length;

        return {opcode: "PRELOAD", line, column, start, size, bytes};
    };

    // LOCAL CONSTANTS AND VARIABLES...

    const opcodes = Object.create(null);
    const preloads = Object.create(null);
    const variables = Object.create(null);

    let lead, token, types, lvalue, rvalue, operator, instruction, notation;
    let next = tokens.next().value;
    let offset = 0;

    // REGISTER THE INSTRUCTIONS (OPCODES AND GRAMMARS)...

    for (let opcode in instructions) {

        const instruction = instructions[opcode];

        if ("implicit" in instruction) registerImplicit(opcode, instruction);
        else registerExplicit(opcode, instruction);
    }

    // RUN THE MAIN LOOP UNTIL THE TOKENS ARE EXHUSTED...

    while (advance("variable", "opcode", "number", "declarator")) {

        /* Every iteration expects to handle one complete instruction, which
        will begin with a variable name (assignments), opcode (instructions)
        or an address number (preloads). */

        lvalue = token.value;

        if (token.type === "variable") {

            /* Variable names are followed by a suffix label operator (`:`),
            an infix let operator (`=`) with an address for its rvalue, or an
            infix preload operator (`<-`) with a range of valid rvalues. */

            advance("label", "let", "preload");

            if (token.type === "label") variables[lvalue] = offset;

            else if (token.type === "let") {

                advance("declarator", "number");
                variables[lvalue] = gatherSimpleOperand();

            } else if (token.type === "preload") {

                lead = token;
                lvalue = variables[lvalue];

                yield assemblePreload(lvalue, lead, gatherPreloadData());

            } else rejectToken(token);

        } else if (token.type === "number" || token.type === "declarator") {

            /* Statements that begin with numbers are always preloads. The
            number is followed by the preload operator, then one or more
            rvalues. */

            lead = token;
            lvalue = gatherSimpleOperand();
            advance("preload");

            yield assemblePreload(lvalue, lead, gatherPreloadData());

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
