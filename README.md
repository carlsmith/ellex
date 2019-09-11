# Ellex 68K

This is just a backup of a personal project, but it is GPLv3 (as ever)
if you want to use anything from it.

## Programming the 650K CPU

The syntax and model will be familiar to anyone who has ever programmed the
MOS 6502, but the 650K is unique, with its own ISA that is not compatible
with any other chip.

The 650K was designed to be emulated, and optimized for fun. It has features
that permit exploration of different approaches to a problem. For example,
there is a decimal mode and a half-carry flag, which is used primarily
for doing the same calculations manually.

Some features were not copied from the 6502 family, as they make little
sense in emulation, and removing them frees up space for other features.
This was why the concept of the *Zero Page* was eliminated: Addressing
modes tend to exponentially increase the number of internal opcodes
(which is limited to 256), making it difficult to add more than a
couple of extra instructions.

Other features were simplified. For example, instructions always take one
cycle unless they interact with memory, where they always take two. Other
features were extended to make the feature set more uniform. For example,
every instruction can use every addressing mode (that makes sense for the
specifics of that instruction).

### General Notes

The stack pointer is automatically set to `11111111` when the CPU starts up.
You do not need to initialize it.

The system uses an *empty stack* (its pointer marks *the next empty* slot),
just like a 6502. Unlike a 6502, the stack starts at `FFFF` (the top of
the 64KB of RAM). It still grows downwards to fill the page, which is
now the highest 256 bytes in memory (the top page).

Instructions are loaded into low memory, from `0000` upwards.

VRAM and other memory mapped IO (user input devices, the RNG et cetera) is
in a seperate memory bank, which is also 64KB.

## The Assemlby Language

The 650K has its own assembler.


### Comments

Comments begin with a pound character (`#`), and continue to the end of
the line.

### Statement Grammar

Every instruction has a three character opcode, which is optionally followed
by an operand which will uses one of a number of grammars to indicate the
address and addressing mode:

``` go
0 "Implicit"              INS               # Target is implied by the opcode
1 "Immediate"             INS ! 00          # Target is the operand

2 "Absolute"              INS 0000          # Target at 0000
3 "Absolute Indexed X"    INS 0000, X       # Target at 0000 + X
4 "Absolute Indexed Y"    INS 0000, Y       # Target at 0000 + Y

5 "Indirect"              INS [0000]        # Target at address stored at 0000, 0001
6 "Indirect Indexed X"    INS [0000], X     # Target at address stored at [0000, 0001] + X
7 "Indirect Indexed Y"    INS [0000], Y     # Target at address stored at [0000, 0001] + Y
8 "Indexed Indirect X"    INS [0000, X]     # Target at address stored at [0000 + X, 0001 + X]
9 "Indexed Indirect Y"    INS [0000, Y]     # Target at address stored at [0000 + Y, 0001 + Y]
```

Any operand can be prefixed with a radix declarator, one of `BIN`, `OCT`,
`DEC` or `HEX` to specify the notation used in that operand expression. For
example:

    INS BIN 10101111
    INS HEX FF00
    INS OCT ! 100

Note that `HEX` is inferred unless a radix is specified explicitly.

A number can be any length lexically, so these instructions are equivalent:

    INS BIN 0000000000000100
    INS BIN 100

Numbers are parsed into bytes by the assembler, so these instructions are
also equivalent:

    INS 10
    INS DEC 16
    INS BIN 10000

### Variables

Variable names must start with a lowercase letter, and only contain letters
(of any case). For example, `x` or `topScore`.

Note that opcodes, constants, radix declarators nor hexidecimals ever use
lowercase letters. Only user defined names contain lowers (and always,
at least, begin with one).

Variables are initialized (before they can be used) using the `name = number`
grammar, for example:

    lastPage = FFFE

Declarators are also legal in variable initializations:

    two = BIN 10

During assembly, variables can hold any JavaScript Number, though you will get
a `ValueError` if you use the variable in a context where the value is out of
range.

### Labels

If a name is suffixed with a colon operator (`:`), the name is a *label* (a
variable that infers its value using the *address* of the instruction
following the operator).

    label: INS 0000

The instruction does not have to be on the same line:

    loop:

        INS 0000
        INS 0001
        INS loop

Note that indentation has no meaning to the assembler.

### Constants

Some instructions use an immediate (8-bit) value to specify a register or
some other parameter. To make things easier, there are a set of constants
builtin to the assembler you can use instead of numerical codes. They all
begin with a dollar character:

    INS $CF # the constant `$CF` is associated with the carry flag

## TODOS

+ Add tests for every valid and (plausible) invalid grammar.
+ Add ways to copy and initialize blocks of memory.
+ Add support for macros, ASCII and block memory initialization.
+ Explore these:

    INV - two's complement
    BCN - bit count, compute number of 1-bits
    HBS - determine bit number of highest bit that is set (like log2)
    HBC - determine bit number of highest bit that is clear
    BSW - bit swap - exchange bit 7 with bit 0, bit 6 with bit 1, etc

+ Put this code somewhere:

``` js
const cap = function(value, mode, token) {

    if (mode === "implicit") return;
    if (mode === "immediate" && value < 256) return;
    if (value < 25536) return;

    chuck("Value", `operand out of range (dec ${value})`, token);
};
```