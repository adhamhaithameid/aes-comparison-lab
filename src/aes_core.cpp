// aes_core.cpp
//
// Implementation A — AES-128 from scratch, per FIPS 197.
//
// The S-box is NOT transcribed from a table: it is computed at startup from
// first principles (multiplicative inverse in GF(2^8) followed by the affine
// transformation of FIPS 197 §3.4.1). This both demonstrates the mathematics
// and eliminates transcription errors. The computed table is verified against
// published known values in the test suite (tests/test_main.cpp).

#include "aes_core.hpp"

#include <stdexcept>

namespace aes {

// ---------------------------------------------------------------------------
// GF(2^8) arithmetic
// ---------------------------------------------------------------------------

// Multiply two elements of GF(2^8) modulo the AES irreducible polynomial
// m(x) = x^8 + x^4 + x^3 + x + 1 (0x11B), using the "xtime" (Russian peasant)
// method.
std::uint8_t AES128::gf_mul(std::uint8_t a, std::uint8_t b) {
    std::uint8_t result = 0;
    for (int i = 0; i < 8; ++i) {
        if (b & 1) {
            result ^= a;
        }
        // xtime(a): multiply by x (i.e. shift left), reducing modulo m(x)
        // when the x^8 term appears.
        bool carry = (a & 0x80) != 0;
        a = static_cast<std::uint8_t>(a << 1);
        if (carry) {
            a ^= 0x1B; // 0x11B without the x^8 term
        }
        b >>= 1;
    }
    return result;
}

// Multiplicative inverse in GF(2^8) via exhaustive search. For every nonzero
// x there is exactly one y with x*y = 1; 0 maps to 0 by convention (FIPS 197
// §3.4.1). Exhaustive search is simple, obviously correct, and runs once at
// table construction.
static std::uint8_t gf_inv(std::uint8_t x) {
    if (x == 0) {
        return 0;
    }
    for (int y = 1; y < 256; ++y) {
        if (AES128::gf_mul(x, static_cast<std::uint8_t>(y)) == 1) {
            return static_cast<std::uint8_t>(y);
        }
    }
    return 0; // unreachable for a valid field
}

// Affine transformation of FIPS 197 §3.4.1:
//   b'_i = b_i XOR b_{(i+4) mod 8} XOR b_{(i+5) mod 8} XOR b_{(i+6) mod 8}
//          XOR b_{(i+7) mod 8} XOR c_i,  with c = 0x63
static std::uint8_t affine_transform(std::uint8_t b) {
    std::uint8_t result = 0;
    for (int i = 0; i < 8; ++i) {
        std::uint8_t bit = ((b >> i) & 1) ^ ((b >> ((i + 4) % 8)) & 1) ^
                           ((b >> ((i + 5) % 8)) & 1) ^ ((b >> ((i + 6) % 8)) & 1) ^
                           ((b >> ((i + 7) % 8)) & 1);
        result |= static_cast<std::uint8_t>(bit << i);
    }
    return result ^ 0x63;
}

std::uint8_t AES128::sbox(std::uint8_t x) {
    return affine_transform(gf_inv(x));
}

std::uint8_t AES128::inv_sbox(std::uint8_t x) {
    // Inverse S-box: invert the affine transform, then invert in GF(2^8).
    // The inverse affine transform is b_i = b'_{(i+2) mod 8} XOR
    // b'_{(i+5) mod 8} XOR b'_{(i+7) mod 8} XOR d_i, with d = 0x05.
    std::uint8_t b = x;
    std::uint8_t result = 0;
    for (int i = 0; i < 8; ++i) {
        std::uint8_t bit = ((b >> ((i + 2) % 8)) & 1) ^ ((b >> ((i + 5) % 8)) & 1) ^
                           ((b >> ((i + 7) % 8)) & 1);
        result |= static_cast<std::uint8_t>(bit << i);
    }
    result ^= 0x05;
    return gf_inv(result);
}

// ---------------------------------------------------------------------------
// Key expansion (FIPS 197 §5.2)
// ---------------------------------------------------------------------------

bool AES128::expand_key(const std::uint8_t* key, std::size_t key_len,
                        RoundKeySchedule& out_round_keys) {
    if (key == nullptr || key_len != KEY_SIZE_128) {
        return false;
    }

    // The first round key is the key itself.
    for (std::size_t i = 0; i < KEY_SIZE_128; ++i) {
        out_round_keys[i] = key[i];
    }

    // Rcon values: Rcon[j] = x^(j-1) in GF(2^8), i.e. 01, 02, 04, 08, 10, 20,
    // 40, 80, 1B, 36 for j = 1..10. Computed with xtime rather than hardcoded.
    std::uint8_t rcon = 0x01;
    for (int word = 4; word < 44; ++word) {
        // Each word is 4 bytes; word i starts at byte offset 4*i.
        std::uint8_t* prev = out_round_keys.data() + 4 * (word - 1);
        std::uint8_t* cur = out_round_keys.data() + 4 * word;

        // temp = SubWord(RotWord(prev)) XOR Rcon for words where i mod 4 == 0.
        std::uint8_t temp[4] = {prev[0], prev[1], prev[2], prev[3]};
        if (word % 4 == 0) {
            // RotWord: rotate left by one byte (a,b,c,d) -> (b,c,d,a).
            std::uint8_t first = temp[0];
            temp[0] = temp[1];
            temp[1] = temp[2];
            temp[2] = temp[3];
            temp[3] = first;
            // SubWord: apply S-box to each byte.
            for (int i = 0; i < 4; ++i) {
                temp[i] = sbox(temp[i]);
            }
            temp[0] ^= rcon;
            // Advance Rcon: multiply by x in GF(2^8).
            rcon = gf_mul(rcon, 0x02);
        }

        // w[i] = w[i-4] XOR temp
        const std::uint8_t* back = out_round_keys.data() + 4 * (word - 4);
        for (int i = 0; i < 4; ++i) {
            cur[i] = static_cast<std::uint8_t>(back[i] ^ temp[i]);
        }
    }
    return true;
}

AES128::AES128(const Key128& key) {
    if (!expand_key(key.data(), key.size(), round_keys_)) {
        throw InvalidKeySize();
    }
}

// ---------------------------------------------------------------------------
// Round transformations (FIPS 197 §4)
// ---------------------------------------------------------------------------

// SubBytes: apply the S-box to each of the 16 state bytes.
void AES128::sub_bytes(Block& state) {
    for (auto& byte : state) {
        byte = sbox(byte);
    }
}

// InvSubBytes: apply the inverse S-box to each state byte.
void AES128::inv_sub_bytes(Block& state) {
    for (auto& byte : state) {
        byte = inv_sbox(byte);
    }
}

// ShiftRows: row r of the state is cyclically shifted left by r positions.
// With the flat layout state[r + 4*c], the new value at (r, c) is the old
// value at (r, (c + r) mod 4).
void AES128::shift_rows(Block& state) {
    Block original = state;
    for (int r = 0; r < 4; ++r) {
        for (int c = 0; c < 4; ++c) {
            state[r + 4 * c] = original[r + 4 * ((c + r) % 4)];
        }
    }
}

// InvShiftRows: row r is cyclically shifted RIGHT by r positions.
void AES128::inv_shift_rows(Block& state) {
    Block original = state;
    for (int r = 0; r < 4; ++r) {
        for (int c = 0; c < 4; ++c) {
            state[r + 4 * c] = original[r + 4 * ((c + 4 - r) % 4)];
        }
    }
}

// MixColumns: each column (4 consecutive bytes in the flat layout) is
// multiplied by the fixed matrix
//   [02 03 01 01]
//   [01 02 03 01]
//   [01 01 02 03]
//   [03 01 01 02]
// over GF(2^8).
void AES128::mix_columns(Block& state) {
    for (int c = 0; c < 4; ++c) {
        std::uint8_t* col = state.data() + 4 * c;
        std::uint8_t s0 = col[0], s1 = col[1], s2 = col[2], s3 = col[3];
        col[0] = static_cast<std::uint8_t>(gf_mul(s0, 0x02) ^ gf_mul(s1, 0x03) ^ s2 ^ s3);
        col[1] = static_cast<std::uint8_t>(s0 ^ gf_mul(s1, 0x02) ^ gf_mul(s2, 0x03) ^ s3);
        col[2] = static_cast<std::uint8_t>(s0 ^ s1 ^ gf_mul(s2, 0x02) ^ gf_mul(s3, 0x03));
        col[3] = static_cast<std::uint8_t>(gf_mul(s0, 0x03) ^ s1 ^ s2 ^ gf_mul(s3, 0x02));
    }
}

// InvMixColumns: multiply each column by the inverse matrix
//   [0E 0B 0D 09]
//   [09 0E 0B 0D]
//   [0D 09 0E 0B]
//   [0B 0D 09 0E]
void AES128::inv_mix_columns(Block& state) {
    for (int c = 0; c < 4; ++c) {
        std::uint8_t* col = state.data() + 4 * c;
        std::uint8_t s0 = col[0], s1 = col[1], s2 = col[2], s3 = col[3];
        col[0] = static_cast<std::uint8_t>(gf_mul(s0, 0x0E) ^ gf_mul(s1, 0x0B) ^
                                            gf_mul(s2, 0x0D) ^ gf_mul(s3, 0x09));
        col[1] = static_cast<std::uint8_t>(gf_mul(s0, 0x09) ^ gf_mul(s1, 0x0E) ^
                                            gf_mul(s2, 0x0B) ^ gf_mul(s3, 0x0D));
        col[2] = static_cast<std::uint8_t>(gf_mul(s0, 0x0D) ^ gf_mul(s1, 0x09) ^
                                            gf_mul(s2, 0x0E) ^ gf_mul(s3, 0x0B));
        col[3] = static_cast<std::uint8_t>(gf_mul(s0, 0x0B) ^ gf_mul(s1, 0x0D) ^
                                            gf_mul(s2, 0x09) ^ gf_mul(s3, 0x0E));
    }
}

// AddRoundKey: XOR the 16-byte round key into the state.
void AES128::add_round_key(Block& state, const std::uint8_t* round_key) {
    for (std::size_t i = 0; i < BLOCK_SIZE; ++i) {
        state[i] ^= round_key[i];
    }
}

// ---------------------------------------------------------------------------
// Block encryption / decryption (FIPS 197 §5.1 / §5.3)
// ---------------------------------------------------------------------------

void AES128::encrypt_block(Block& inout) const {
    add_round_key(inout, round_keys_.data());
    for (int round = 1; round < NUM_ROUNDS_128; ++round) {
        sub_bytes(inout);
        shift_rows(inout);
        mix_columns(inout);
        add_round_key(inout, round_keys_.data() + BLOCK_SIZE * round);
    }
    // Final round has no MixColumns.
    sub_bytes(inout);
    shift_rows(inout);
    add_round_key(inout, round_keys_.data() + BLOCK_SIZE * NUM_ROUNDS_128);
}

void AES128::decrypt_block(Block& inout) const {
    add_round_key(inout, round_keys_.data() + BLOCK_SIZE * NUM_ROUNDS_128);
    for (int round = NUM_ROUNDS_128 - 1; round >= 1; --round) {
        inv_shift_rows(inout);
        inv_sub_bytes(inout);
        add_round_key(inout, round_keys_.data() + BLOCK_SIZE * round);
        inv_mix_columns(inout);
    }
    // Final round has no InvMixColumns.
    inv_shift_rows(inout);
    inv_sub_bytes(inout);
    add_round_key(inout, round_keys_.data());
}

// ---------------------------------------------------------------------------
// Validation-only ECB helpers (see header warning: NOT a secure mode)
// ---------------------------------------------------------------------------

bool aes128_ecb_encrypt_validate(const AES128& cipher, const std::uint8_t* data,
                                 std::size_t data_len, std::uint8_t* out) {
    if (data_len % BLOCK_SIZE != 0) {
        return false; // never pad; caller must handle partial blocks
    }
    for (std::size_t offset = 0; offset < data_len; offset += BLOCK_SIZE) {
        Block block{};
        for (std::size_t i = 0; i < BLOCK_SIZE; ++i) {
            block[i] = data[offset + i];
        }
        cipher.encrypt_block(block);
        for (std::size_t i = 0; i < BLOCK_SIZE; ++i) {
            out[offset + i] = block[i];
        }
    }
    return true;
}

bool aes128_ecb_decrypt_validate(const AES128& cipher, const std::uint8_t* data,
                                 std::size_t data_len, std::uint8_t* out) {
    if (data_len % BLOCK_SIZE != 0) {
        return false;
    }
    for (std::size_t offset = 0; offset < data_len; offset += BLOCK_SIZE) {
        Block block{};
        for (std::size_t i = 0; i < BLOCK_SIZE; ++i) {
            block[i] = data[offset + i];
        }
        cipher.decrypt_block(block);
        for (std::size_t i = 0; i < BLOCK_SIZE; ++i) {
            out[offset + i] = block[i];
        }
    }
    return true;
}

} // namespace aes
