/* MAIN FILE
This file urrently just tests the three-stage pipeline:

    source -> tokens gen -> instructions gen -> bytecode gen -> bytes

The process is divided into three stages to make it easier to implement and
understand, and to partially compile source code to tokens or instruction
hashes.
*/

import { tokenize } from "/static/tokenizer.js";
import { assemble } from "/static/assembler.js";
import { finalize } from "/static/finalizer.js";

const source = `
snakeHead = FF
snakeEyes = HEX FF

snakeHead <- 50
OCT 10 <- 00FF | 1FF | DEC 30

spam:
                            ################################
    TMA BIN [00000100, Y]   # binary notation example      #
    TAM [snakeEyes, X]      # variables are numeric macros #
    TMA HEX ! 80            ################################
    AOA

foo: TMA snakeEyes, X

TAM [snakeHead], Y
TMA ! snakeEyes
TMA $CF
`;

console.log("TOKENS...");
for (let token of tokenize(source)) console.log(token);

console.log("INSTRUCTIONS...");
for (let instruction of assemble(tokenize(source))) console.log(instruction);

console.log("BYTES...");
console.log(Array.from(finalize(assemble(tokenize(source)))));
