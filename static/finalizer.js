/* CODE GENERATOR
This file implements and exports the code generator, which finalizes the
assembly process. This is the last of three stages.
*/

const hexidecimalize = function(number) {

    /* This helper converts an integer to a hexidecimal string. */

    return number.toString(16).toUpperCase();
};

const rejectValue = function(instruction, limit) {

    /* This helper handles bad operands. It takes an instruction hash that
    contains the offending value and corresponding lexical information. It
    also takes an integer that specifes the upper bound for the value. */

    const { line, column } = instruction;
    const value = hexidecimalize(instruction.value);

    throw `AssemblyValueError[${line}:${column}]: over ${limit} (${value})`;
};

const rejectPreload = function(instruction) {

    /* This helper handles preloads of more than 255 bytes. */

    const { size, line, column } = instruction;

    throw `AssemblyPreloadError[${line}:${column}]: too many (${size}) bytes`;
};

const rejectAddress = function(instruction) {

    /* This helper handles preloads with invalid addresses. */

    const { line, column } = instruction;
    const start = hexidecimalize(instruction.start);

    throw `AssemblyPreloadError[${line}:${column}]: bad address (${start})`;
};

export const finalize = function * (instructions) {

    /* This function finalizes the assembly process. It takes instructions
    from the `assembly` generator, and yields the individual bytes as ints
    between `0` and `255` (inclusive). */

    for (let instruction of instructions) {

        // HANDLE LOADTIME INSTRUCTIONS...

        if (instruction.opcode === "PRELOAD") {

            yield 0x01;                                 // the opcode

            if (instruction.start > 0xFFFF) rejectAddress(instruction);

            if (instruction.size > 0xFF) rejectPreload(instruction);

            yield instruction.start;                    // the location
            yield instruction.size;                     // the length

            for (let byte of instruction.bytes) {

                if (byte.value > 0xFF) rejectValue(byte, 0xFF);

                yield byte.value;                       // one raw byte
            }

            continue;
        }

        // HANDLE REGULAR RUNTIME INSTRUCTIONS...

        yield instruction.instruction[instruction.mode]; // the opcode

        if (instruction.mode === "implicit") continue;   // implicit operand

        if (instruction.mode === "immediate") {

            if (instruction.value > 0xFF) rejectValue(instruction, 0xFF);

            yield instruction.value;                     // one-byte operand

        } else {

            if (instruction.value > 0xFFFF) rejectValue(instruction, 0xFFFF);

            yield instruction.value % 0xFF;              // operand, low byte

            yield Math.floor(instruction.value / 0xFF);  // operand, high byte
        }
    }
};
