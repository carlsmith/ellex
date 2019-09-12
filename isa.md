Ellex System 65 ISA
===================

There are nine explicit addressing modes, with one that is implicit:

``` go
0 "Implicit"              INS               // Target is implied by the opcode
1 "Immediate"             INS ! 00          // Target is the operand

2 "Absolute"              INS 0000          // Target at 0000
3 "Absolute Indexed X"    INS 0000, X       // Target at 0000 + X
4 "Absolute Indexed Y"    INS 0000, Y       // Target at 0000 + Y

5 "Indirect"              INS [0000]        // Target at address stored at 0000, 0001
6 "Indirect Indexed X"    INS [0000], X     // Target at address stored at [0000, 0001] + X
7 "Indirect Indexed Y"    INS [0000], Y     // Target at address stored at [0000, 0001] + Y
8 "Indexed Indirect X"    INS [0000, X]     // Target at address stored at [0000 + X, 0001 + X]
9 "Indexed Indirect Y"    INS [0000, Y]     // Target at address stored at [0000 + Y, 0001 + Y]
```

INSTRUCTIONS
------------

Prefixes:

+ A  -> Addition
+ B  -> Bitwise
+ C  -> Comparison
+ DM -> Decimal Mode
+ II -> Ignore IRQs
+ J  -> Jump
+ L  -> Leftwise
+ P  -> Push/Pop
+ R  -> Rightwise
+ S  -> Subtraction
+ T  -> Transfer

Remaining:

+ D(M)
+ E
+ F
+ G
+ H
+ I(I)
+ K
+ M(B)
+ N(OP)
+ O
+ Q
+ U
+ V
+ W
+ X
+ Y
+ Z

# REGISTERS

There are six registers, which each have a unique initial:

A -> The Accumulator         8 bit general purpose
X -> The X Index Register    8 bit index register
Y -> The Y Index Register    8 bit index register
F -> The Flags Register      8 bit status register
S -> The Stack Pointer       8 bit stack index pointer
P -> The Program Counter    16 bit instruction pointer

# CPU STATUS FLAGS

There are eight flags, each using one bit of the Flags Register (F), and
each having a unique initial:

    NZOHCPIR
    76543210

N -> Negative       Set when results are negative (else cleared)
Z -> Zero           Set when results are zero (else cleared)
O -> Over           Set when results overflow (else cleared)
H -> Half Carry     Set when bit 3 is carried (or bit 4 is borrowed) (else cleared)
C -> Carry          Set when bit 7 is carried (or bit 8 is borrowed) (else cleared)
P -> Parity         Set when results are equal (bit 0 is clear) (else cleared)
I -> IRQ Interupt   Set when the current routine is an interupt (else cleared)
R -> Result         Set or cleared by testing other bits (see BTB)

# CPU MODES, SET AND DISABLE (9)

MB0         1    Select Memory Bank 0 (Main Memory)
MB1         1    Select Memory Bank 1 (Mapped Memory & VRAM)
MBT         1    Test Memory Bank Setting (copy Bank Number to R Flag)

DM0         1    Set Decimal Mode to 0
DM1         1    Set Decimal Mode to 1
DMT         1    Test Decimal Mode (copy Mode to R Flag)

II0         1    Set Ignore IRQs to 0
II1         1    Set Ignore IRQs to 1
IIT         1    Test Ignore IRQs (copy Mode to R Flag)

# TRANSFER, LOAD AND STORE (74)

TAX         1    Transfer A to X
TAY         1    Transfer A to Y
TXA         1    Transfer X to A
TYA         1    Transfer Y to A

TMA &       2    Transfer & to A                                1...9   -> 9
TMX &       2    Transfer & to X                                1...9   -> 9
TMY &       2    Transfer & to Y                                1...9   -> 9
TAM &       2    Transfer A to &                                2...9   -> 8
TXM &       2    Transfer X to &                                2...9   -> 8
TYM &       2    Transfer Y to &                                2...9   -> 8

TSA         1    Transfer the Stack Pointer to A
TAS         1    Transfer A to the Stack Pointer

TPM &       1    Transfer the Program Counter to &              2...9   -> 8
TMP &       1    Transfer & to the Program Counter              2...9   -> 8

THL         1    Trade HiBit with LoBit (in A)

# STACK (PUSH/POP) OPERATIONS (6)

PAS         2    Push A to the Stack
PFS         2    Push F to the Stack
PPS         2    Push the Program Counter to the stack (two bytes)

PSA         2    Pop the Stack into A
PSF         2    Pop the Stack into F
PSP         2    Pop the Stack into the Program Counter (two bytes)

# JUMPS AND CONDITIONAL BRANCHING (38)

JN0 &       2    Branch to & if N is 0                          2/5     -> 2
JZ0 &       2    Branch to & if Z is 0                          2/5     -> 2
JH0 &       2    Branch to & if H is 0                          2/5     -> 2
JC0 &       2    Branch to & if C is 0                          2/5     -> 2
JO0 &       2    Branch to & if O is 0                          2/5     -> 2
JP0 &       2    Branch to & if P is 0                          2/5     -> 2
JI0 &       2    Branch to & if I is 0                          2/5     -> 2
JR0 &       2    Branch to & if R is 0                          2/5     -> 2

JN1 &       2    Branch to & if N is 1                          2/5     -> 2
JZ1 &       2    Branch to & if Z is 1                          2/5     -> 2
JH1 &       2    Branch to & if H is 1                          2/5     -> 2
JC1 &       2    Branch to & if C is 1                          2/5     -> 2
JO1 &       2    Branch to & if O is 1                          2/5     -> 2
JP1 &       2    Branch to & if P is 1                          2/5     -> 2
JI1 &       2    Branch to & if I is 1                          2/5     -> 2
JR1 &       2    Branch to & if R is 1                          2/5     -> 2

JTS &       2    Jump to Subroutine at & and update the Stack   2/5     -> 2
JTR         1    Jump to return address by popping the Stack

JMP &       2    Jump to an address                             2/5     -> 2

BRK         1    Break/Interupt

NOP         1    Idle for one cycle

# BITWISE OPERATIONS (37)

BNA         1    NOT A

BAX         1    A AND X
BAY         1    A AND Y
BAM &       2    A AND &                                        1...9   -> 9

BOX         1    A OR X
BOY         1    A OR Y
BOM &       2    A OR &                                         1...9   -> 9

BXX         1    A XOR X
BXY         1    A XOR Y
BXM &       2    A XOR &                                        1...9   -> 9

BSB $       1    Set the bit defined by $                       1       -> 1
BCB $       1    Clear the bit defined by $                     1       -> 1
BTB $       1    Test the bit defined by $ (result in R Flag)   1       -> 1

# COMPARISONS (11)

CAX         1    Compare A to X
CAY         1    Compare A to Y
CAM &       2    Compare A to &                                 1...9   -> 9

# LEFTWISE OPERATIONS (2)

LSA         1    Leftshift Accumultor (putting the hibit in the Overflow Flag)
LRA         1    Leftroll Accumultor (replacing the lobit with the hibit)

# RIGHTWISE OPERATIONS (2)

RSA         1    Rightshift Accumultor (putting the lobit in the Overflow Flag)
RRA         1    Rightroll Accumulator (replacing the hibit with the lobit)

# ADDITION OPERATIONS (32)

AOA         1    Add one to A
AOX         1    Add one to X (and update the flags)
AOY         1    Add one to Y (and update the flags)
AOM &       1    Add one to & (and update the flags)             1...9   -> 9

AAP         1    Add A to the Program Counter
AAS         1    Add A to the Stack Pointer
AAM &       2    Add A to & (and update the flags)               1...9   -> 9

AMA &       2    Add & to A                                      1...9   -> 9

# SUBTRACTION OPERATIONS (32)

SOA         1    Subtract one from A
SOX         1    Subtract one from X (and update the flags)
SOY         1    Subtract one from Y (and update the flags)
SOM &       1    Subtract one from & (and update the flags)      1...9   -> 9

SAP         1    Subtract A from the Program Counter
SAS         1    Subtract A from the Stack Pointer
SAM &       2    Subtract A from & (and update the flags)        1...9   -> 9

SMA &       2    Subtract & from A                               1...9   -> 9
