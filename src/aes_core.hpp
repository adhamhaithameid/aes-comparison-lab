// aes_core.hpp
//
// Implementation A — AES-128 block cipher implemented from scratch in C++,
// following the FIPS 197 specification (https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.197-upd1.pdf).
//
// This implementation is intended for EDUCATIONAL and VALIDATION purposes:
// it exposes every AES transformation (SubBytes, ShiftRows, MixColumns,
// AddRoundKey, key expansion) so the algorithm can be studied and tested
// against known-answer vectors.
//
// SECURITY NOTE: This is a raw block cipher. It performs no authentication,
// provides no protection against tampering, and must NOT be used to encrypt
// real data in production. Use the OpenSSL AES-128-GCM wrapper
// (aes_gcm_openssl.hpp) for authenticated encryption, or a vetted
// authenticated-encryption library in general.
//
// Scope: AES-128 only (128-bit keys, 10 rounds). The 16-byte block size is
// enforced explicitly; no padding is performed. ECB-style multi-block helpers
// are provided for validation only.

#pragma once

#include <array>
#include <cstddef>
#include <cstdint>
#include <vector>

namespace aes {

// AES block and key sizes (AES-128).
constexpr std::size_t BLOCK_SIZE = 16;   // 128-bit block
constexpr std::size_t KEY_SIZE_128 = 16; // 128-bit key
constexpr int NUM_ROUNDS_128 = 10;
constexpr std::size_t ROUND_KEYS_SIZE_128 =
    BLOCK_SIZE * (NUM_ROUNDS_128 + 1); // 11 round keys = 176 bytes

// A 128-bit AES state/block is stored as a flat 16-byte array using the
// FIPS 197 mapping: the i-th input byte maps to state[row = i % 4][col = i / 4]
// (i.e. the block fills the state column by column). Keeping this layout means
// input bytes 0..3 are the first column, bytes 4..7 the second, etc.
using Block = std::array<std::uint8_t, BLOCK_SIZE>;
using Key128 = std::array<std::uint8_t, KEY_SIZE_128>;

// Round-key schedule for AES-128: 11 round keys of 16 bytes each.
using RoundKeySchedule = std::array<std::uint8_t, ROUND_KEYS_SIZE_128>;

class AES128 {
public:
    // Thrown for invalid key material (a size other than 16 bytes).
    struct InvalidKeySize : std::runtime_error {
        InvalidKeySize() : std::runtime_error("AES128: key must be exactly 16 bytes") {}
    };

    // Construct from a 128-bit key, performing key expansion immediately.
    explicit AES128(const Key128& key);

    // Perform key expansion over an arbitrary-length key buffer.
    // Returns true on success; returns false (without throwing) if the key
    // length is not exactly 16 bytes, so callers can handle invalid input.
    static bool expand_key(const std::uint8_t* key, std::size_t key_len,
                           RoundKeySchedule& out_round_keys);

    // Encrypt / decrypt exactly one 128-bit block in place using the stored
    // round-key schedule.
    void encrypt_block(Block& inout) const;
    void decrypt_block(Block& inout) const;

    // Individual transformations, exposed for unit testing and educational
    // tracing. Each operates on a 16-byte block in the FIPS 197 state layout.
    static void sub_bytes(Block& state);        // non-linear byte substitution
    static void inv_sub_bytes(Block& state);    // inverse of SubBytes
    static void shift_rows(Block& state);       // row rotation
    static void inv_shift_rows(Block& state);   // inverse of ShiftRows
    static void mix_columns(Block& state);      // GF(2^8) column mixing
    static void inv_mix_columns(Block& state);  // inverse of MixColumns
    static void add_round_key(Block& state, const std::uint8_t* round_key);

    // Public S-box accessors (computed programmatically from GF(2^8)
    // arithmetic; see aes_core.cpp).
    static std::uint8_t sbox(std::uint8_t x);
    static std::uint8_t inv_sbox(std::uint8_t x);

    // GF(2^8) multiplication, used by MixColumns.
    static std::uint8_t gf_mul(std::uint8_t a, std::uint8_t b);

    const RoundKeySchedule& round_keys() const { return round_keys_; }

private:
    RoundKeySchedule round_keys_;
};

// ---------------------------------------------------------------------------
// Validation-only multi-block helpers (NOT a secure encryption mode).
//
// These apply the raw AES block cipher to each 16-byte block independently,
// i.e. ECB mode with no padding. They exist solely so the block cipher can
// be cross-validated against multi-block NIST test vectors (SP 800-38A).
// They MUST NOT be used for real data: ECB leaks plaintext patterns and
// provides no integrity protection.
// ---------------------------------------------------------------------------

// Returns false if data_len is not a multiple of BLOCK_SIZE (the caller is
// responsible for handling partial blocks — this code never pads).
bool aes128_ecb_encrypt_validate(const AES128& cipher,
                                 const std::uint8_t* data, std::size_t data_len,
                                 std::uint8_t* out);

bool aes128_ecb_decrypt_validate(const AES128& cipher,
                                 const std::uint8_t* data, std::size_t data_len,
                                 std::uint8_t* out);

} // namespace aes
