/* CODE GENERATOR
This file implements and exports the code generator, which finalizes the
assembly process. This is the last of three stages.
*/

const reject = function(instruction, limit) {

    /* This helper handles bad operands. It takes an instruction hash that
    contains the offending value and corresponding lexical information. It
    also takes an integer that specifes the upper bound for the value. */

    const { value, line, column } = instruction;

    throw `AssemblyValueError[${line}:${column}]: over ${limit} (${value})`;
};

export const finalize = function * (instructions) {

    /* This function finalizes the assembly process. It takes instructions
    from the `assembly` generator, and yields the individual bytes as ints
    between `0` and `255` (inclusive). */

    for (let instruction of instructions) {

        yield instruction.instruction[instruction.mode]; // the opcode

        if (instruction.mode === "implicit") continue;   // implicit operand

        if (instruction.mode === "immediate") {

            if (instruction.value > 0xFF) reject(instruction, 0xFF);

            yield instruction.value;                     // one-byte operand

        } else {

            if (instruction.value > 0xFFFF) reject(instruction, 0xFFFF);

            yield instruction.value % 0xFF;              // operand, low byte

            yield Math.floor(instruction.value / 0xFF);  // operand, high byte
        }
    }
};
