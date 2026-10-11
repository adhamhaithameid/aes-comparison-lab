/**
 * aes-js.js — Educational JavaScript AES-128 Implementation
 *
 * ⚠️ EDUCATIONAL IMPLEMENTATION — NOT FOR PRODUCTION USE ⚠️
 *
 * This is a slow, clear reference implementation for learning AES.
 * It is intentionally simple and does NOT include:
 *   - Constant-time protections (vulnerable to timing attacks)
 *   - Hardware acceleration (AES-NI)
 *   - Side-channel protections
 *   - Key schedule caching optimizations
 *
 * For production use, use OpenSSL, libsodium, or Web Crypto API.
 *
 * Based on FIPS 197 (Advanced Encryption Standard)
 */

(function (global) {
  'use strict';

  // ==========================================================================
  // AES S-Box (Substitution Box)
  // ==========================================================================
  const SBOX = [
    0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
    0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
    0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
    0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
    0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
    0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
    0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
    0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
    0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
    0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
    0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
    0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
    0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
    0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
    0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
    0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16
  ];

  // Inverse S-Box for decryption
  const INV_SBOX = (function () {
    const inv = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      inv[SBOX[i]] = i;
    }
    return inv;
  })();

  // ==========================================================================
  // Rcon (Round Constants)
  // ==========================================================================
  const RCON = [
    0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36,
    0x6c, 0xd8, 0xab, 0x4d, 0x9a, 0x2f, 0x5e, 0xbc, 0x63, 0xc6,
    0x97, 0x35, 0x6a, 0xd4, 0xb3, 0x7d, 0xfa, 0xef, 0xc5, 0x91
  ];

  // ==========================================================================
  // Utility Functions
  // ==========================================================================

  function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
  }

  function bytesToHex(bytes) {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function xorBytes(a, b) {
    const result = new Uint8Array(a.length);
    for (let i = 0; i < a.length; i++) {
      result[i] = a[i] ^ b[i];
    }
    return result;
  }

  // Galois Field (GF(2^8)) multiplication
  function gmul(a, b) {
    let p = 0;
    for (let i = 0; i < 8; i++) {
      if (b & 1) p ^= a;
      const hi = a & 0x80;
      a = (a << 1) & 0xff;
      if (hi) a ^= 0x1b;
      b >>= 1;
    }
    return p;
  }

  // ==========================================================================
  // AES State Operations
  // ==========================================================================

  // Convert 16-byte block to 4x4 state matrix (FIPS 197 column-major ordering)
  // state[r][c] = block[c*4 + r], stored as state[c*4 + r] in flat array
  function blockToState(block) {
    const state = new Uint8Array(16);
    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 4; row++) {
        state[col * 4 + row] = block[col * 4 + row];
      }
    }
    return state;
  }

  // Convert 4x4 state matrix back to 16-byte block
  function stateToBlock(state) {
    const block = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      block[i] = state[i];
    }
    return block;
  }

  // SubBytes: substitute each byte using S-box
  function subBytes(state) {
    const result = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      result[i] = SBOX[state[i]];
    }
    return result;
  }

  function invSubBytes(state) {
    const result = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      result[i] = INV_SBOX[state[i]];
    }
    return result;
  }

  // ShiftRows: cyclically shift each row left by its index
  function shiftRows(state) {
    const result = new Uint8Array(16);
    // Row 0: no shift
    result[0] = state[0]; result[4] = state[4]; result[8] = state[8]; result[12] = state[12];
    // Row 1: shift left by 1
    result[1] = state[5]; result[5] = state[9]; result[9] = state[13]; result[13] = state[1];
    // Row 2: shift left by 2
    result[2] = state[10]; result[6] = state[14]; result[10] = state[2]; result[14] = state[6];
    // Row 3: shift left by 3
    result[3] = state[15]; result[7] = state[3]; result[11] = state[7]; result[15] = state[11];
    return result;
  }

  function invShiftRows(state) {
    const result = new Uint8Array(16);
    // Row 0: no shift
    result[0] = state[0]; result[4] = state[4]; result[8] = state[8]; result[12] = state[12];
    // Row 1: shift right by 1
    result[1] = state[13]; result[5] = state[1]; result[9] = state[5]; result[13] = state[9];
    // Row 2: shift right by 2
    result[2] = state[10]; result[6] = state[14]; result[10] = state[2]; result[14] = state[6];
    // Row 3: shift right by 3
    result[3] = state[7]; result[7] = state[11]; result[11] = state[15]; result[15] = state[3];
    return result;
  }

  // MixColumns: mix each column using GF(2^8) matrix multiplication
  function mixColumns(state) {
    const result = new Uint8Array(16);
    for (let col = 0; col < 4; col++) {
      const i = col * 4;
      const a0 = state[i], a1 = state[i + 1], a2 = state[i + 2], a3 = state[i + 3];
      result[i]     = gmul(a0, 2) ^ gmul(a1, 3) ^ a2 ^ a3;
      result[i + 1] = a0 ^ gmul(a1, 2) ^ gmul(a2, 3) ^ a3;
      result[i + 2] = a0 ^ a1 ^ gmul(a2, 2) ^ gmul(a3, 3);
      result[i + 3] = gmul(a0, 3) ^ a1 ^ a2 ^ gmul(a3, 2);
    }
    return result;
  }

  function invMixColumns(state) {
    const result = new Uint8Array(16);
    for (let col = 0; col < 4; col++) {
      const i = col * 4;
      const a0 = state[i], a1 = state[i + 1], a2 = state[i + 2], a3 = state[i + 3];
      result[i]     = gmul(a0, 14) ^ gmul(a1, 11) ^ gmul(a2, 13) ^ gmul(a3, 9);
      result[i + 1] = gmul(a0, 9) ^ gmul(a1, 14) ^ gmul(a2, 11) ^ gmul(a3, 13);
      result[i + 2] = gmul(a0, 13) ^ gmul(a1, 9) ^ gmul(a2, 14) ^ gmul(a3, 11);
      result[i + 3] = gmul(a0, 11) ^ gmul(a1, 13) ^ gmul(a2, 9) ^ gmul(a3, 14);
    }
    return result;
  }

  // AddRoundKey: XOR state with round key
  function addRoundKey(state, roundKey) {
    return xorBytes(state, roundKey);
  }

  // ==========================================================================
  // Key Expansion (AES-128)
  // ==========================================================================

  function rotWord(word) {
    return ((word << 8) | (word >>> 24)) & 0xffffffff;
  }

  function subWord(word) {
    return (
      (SBOX[(word >>> 24) & 0xff] << 24) |
      (SBOX[(word >>> 16) & 0xff] << 16) |
      (SBOX[(word >>> 8) & 0xff] << 8) |
      SBOX[word & 0xff]
    );
  }

  function keyExpansion128(key) {
    const Nk = 4;  // 128-bit key = 4 words
    const Nr = 10; // 10 rounds
    const totalWords = 4 * (Nr + 1); // 44 words

    const w = new Array(totalWords);

    // First Nk words are the key itself
    for (let i = 0; i < Nk; i++) {
      w[i] = (key[i * 4] << 24) | (key[i * 4 + 1] << 16) | (key[i * 4 + 2] << 8) | key[i * 4 + 3];
    }

    // Expand remaining words
    for (let i = Nk; i < totalWords; i++) {
      let temp = w[i - 1];
      if (i % Nk === 0) {
        temp = subWord(rotWord(temp)) ^ (RCON[i / Nk - 1] << 24);
      }
      w[i] = w[i - Nk] ^ temp;
    }

    // Convert words to round keys (each round key = 16 bytes = 4 words)
    const roundKeys = [];
    for (let round = 0; round <= Nr; round++) {
      const rk = new Uint8Array(16);
      for (let i = 0; i < 4; i++) {
        const word = w[round * 4 + i];
        rk[i * 4]     = (word >>> 24) & 0xff;
        rk[i * 4 + 1] = (word >>> 16) & 0xff;
        rk[i * 4 + 2] = (word >>> 8) & 0xff;
        rk[i * 4 + 3] = word & 0xff;
      }
      roundKeys.push(rk);
    }

    return roundKeys;
  }

  // ==========================================================================
  // AES-128 Encryption (single block)
  // ==========================================================================

  function encryptBlock128(plaintext, roundKeys) {
    const Nr = 10;
    let state = new Uint8Array(plaintext);

    // Initial round
    state = addRoundKey(state, roundKeys[0]);

    // Main rounds
    for (let round = 1; round < Nr; round++) {
      state = subBytes(state);
      state = shiftRows(state);
      state = mixColumns(state);
      state = addRoundKey(state, roundKeys[round]);
    }

    // Final round (no MixColumns)
    state = subBytes(state);
    state = shiftRows(state);
    state = addRoundKey(state, roundKeys[Nr]);

    return state;
  }

  function decryptBlock128(ciphertext, roundKeys) {
    const Nr = 10;
    let state = new Uint8Array(ciphertext);

    // Initial round
    state = addRoundKey(state, roundKeys[Nr]);

    // Main rounds (in reverse)
    for (let round = Nr - 1; round >= 1; round--) {
      state = invShiftRows(state);
      state = invSubBytes(state);
      state = addRoundKey(state, roundKeys[round]);
      state = invMixColumns(state);
    }

    // Final round
    state = invShiftRows(state);
    state = invSubBytes(state);
    state = addRoundKey(state, roundKeys[0]);

    return state;
  }

  // ==========================================================================
  // Full encryption with intermediate states (for visualizer)
  // ==========================================================================

  function encryptWithTrace128(plaintext, roundKeys) {
    const Nr = 10;
    const trace = [];
    let state = new Uint8Array(plaintext);

    // Record initial state
    trace.push({
      round: 0,
      operation: 'Initial State',
      description: 'Plaintext bytes loaded into state matrix',
      state: new Uint8Array(state)
    });

    // Initial AddRoundKey
    state = addRoundKey(state, roundKeys[0]);
    trace.push({
      round: 0,
      operation: 'AddRoundKey',
      description: 'XOR state with round key 0 (original cipher key)',
      state: new Uint8Array(state),
      roundKey: new Uint8Array(roundKeys[0])
    });

    // Main rounds
    for (let round = 1; round < Nr; round++) {
      state = subBytes(state);
      trace.push({
        round: round,
        operation: 'SubBytes',
        description: `Substitute each byte using S-box (round ${round})`,
        state: new Uint8Array(state)
      });

      state = shiftRows(state);
      trace.push({
        round: round,
        operation: 'ShiftRows',
        description: `Cyclically shift rows left (round ${round})`,
        state: new Uint8Array(state)
      });

      state = mixColumns(state);
      trace.push({
        round: round,
        operation: 'MixColumns',
        description: `Mix columns using GF(2^8) matrix multiplication (round ${round})`,
        state: new Uint8Array(state)
      });

      state = addRoundKey(state, roundKeys[round]);
      trace.push({
        round: round,
        operation: 'AddRoundKey',
        description: `XOR state with round key ${round}`,
        state: new Uint8Array(state),
        roundKey: new Uint8Array(roundKeys[round])
      });
    }

    // Final round (no MixColumns)
    state = subBytes(state);
    trace.push({
      round: Nr,
      operation: 'SubBytes',
      description: `Substitute each byte using S-box (final round ${Nr})`,
      state: new Uint8Array(state)
    });

    state = shiftRows(state);
    trace.push({
      round: Nr,
      operation: 'ShiftRows',
      description: `Cyclically shift rows left (final round ${Nr})`,
      state: new Uint8Array(state)
    });

    state = addRoundKey(state, roundKeys[Nr]);
    trace.push({
      round: Nr,
      operation: 'AddRoundKey',
      description: `XOR state with round key ${Nr} (final round)`,
      state: new Uint8Array(state),
      roundKey: new Uint8Array(roundKeys[Nr])
    });

    return { ciphertext: state, trace: trace };
  }

  // ==========================================================================
  // Export
  // ==========================================================================

  const AES = {
    SBOX,
    INV_SBOX,
    RCON,
    hexToBytes,
    bytesToHex,
    xorBytes,
    gmul,
    subBytes,
    invSubBytes,
    shiftRows,
    invShiftRows,
    mixColumns,
    invMixColumns,
    addRoundKey,
    rotWord,
    subWord,
    keyExpansion128,
    encryptBlock128,
    decryptBlock128,
    encryptWithTrace128
  };

  // Export for both browser and Node.js
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AES;
  }
  global.AES = AES;

})(typeof window !== 'undefined' ? window : globalThis);
