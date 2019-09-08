/* CODE GENERATOR
This file implements and exports the code generator. It uses the tokenizer to
convert source code into a token generator that is passed to the assembler to
convert it into an instruction generator, which the code generator consumes.

By only generating the tokens as the assembler needs them, and only generating
the instructions as the code generator needs them, the pipeline combines the
speed and efficiency of a single-pass assembler with the simplicity of a
three-pass implementation. */

import { tokenize } from "/static/tokenizer.js";
import { assemble } from "/static/assembler.js";

const source = `
snakeEyes = bin 100
spam:

    TMA bin [00000100, Y]
    TAM [snakeEyes, X]

foo: TMA snakeEyes, X

TAM [snakeEyes], Y
TMA ! foo
`;

//for (let token of tokenize(source)) console.log(token);

for (let byte of assemble(tokenize(source))) console.log(byte);

