const iife = lambda => lambda();

const CPU = function() {

    // HELPERS...

    const trim = function(byte, length) {
        
        const hex = (byte & 0xFFFF).toString(16);
        return ("000" + hex).slice(-length).toUpperCase();
    };

    const byte2hex = byte => trim(byte, 2);

    const word2hex = word => trim(word, 4);

    const bytes2hexes = $ => Array.from($).map(byte2hex);

    const words2hexes = $ => Array.from($).map(word2hex);

    const putBytes = $ => output.innerHTML = bytes2hexes($).join(" ");

    const putWords = $ => output.innerHTML = words2hexes($).join(" ");

    const compliment = $ => $ < 128 ? $ : -(256 - $);

    const output = document.querySelector("output");

    // MAIN MEMORY...

    const memory = new ArrayBuffer(256);            // ram as raw data
    const numbers = new Int8Array(memory);          // ram in signed bytes
    const bytes = new Uint8Array(memory);           // ram in unsigned bytes
    const vram = new Uint8Array(memory, 156, 100);  // vram in unsigned bytes

    // REGISTERS...

    let running = false;
    let [A, X, Y, F, S, P] = [0x00, 0x00, 0x00, 0x00, 0x00, 0x10];

    // INSTRUCTIONS...

    const handlers = [

        function () {

            /* 0: BRK -> Stop the program, resetting the Program Counter to
            0F (the start of the routine). */

            [running, P] = [false, 0x10];
        },

        function () {

            /* 1: LMA 00 -> Load the byte at the Zero Page address specified
            by the next byte and put it into the Accumulator. */

            A = bytes[bytes[P++]];
        },

        function () {

            /* 2: LAM 00 -> Store the byte in the Accumulator at the Zero Page
            address specified by the next byte. */

            bytes[bytes[P++]] = A;
        },

        function () {

            /* 3: AOA -> Increment the byte in the Accumulator (as a signed
            integer). */

            A = compliment(++A);
        },

        function () {

            /* 4: SOA -> Increment the byte in the Accumulator (as a signed
            integer). */

            A = compliment(--A);
        },
    ];

    // API METHODS...

    this.viewRAM = () => putBytes(bytes);
    this.viewVRAM = () => putBytes(vram);
    this.viewWords = () => putWords(words);
    this.viewProgramCounter = () => putWords([P]);

    this.load = (address, value) => bytes[address] = value;

    this.step = () => handlers[bytes[P++]]();

    this.run = function() {

        /* This method runs the code continually until a BRK instruction (00)
        is executed, setting `running` to `false`. It may be faster to not
        defer to the `step` method on every instruction, but I haven't
        profiled anything yet. */
 
        running = true;
        while (running) this.step();
    };
};

const cpu = new CPU();

// TEST CODE...
cpu.load(0xFF, 0x50);

cpu.load(0x10, 0x01);
cpu.load(0x11, 0xFF);
cpu.load(0x12, 0x03);
cpu.load(0x13, 0x03);
cpu.load(0x14, 0x03);
cpu.load(0x15, 0x03);
cpu.load(0x16, 0x03);
cpu.load(0x17, 0x03);
cpu.load(0x18, 0x02);
cpu.load(0x19, 0xEE);

cpu.run();

//cpu.viewRegisters();
cpu.viewRAM();
//cpu.viewVRAM();

