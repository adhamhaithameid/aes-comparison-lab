// fips197_vectors.h
//
// Known-answer test vectors transcribed from FIPS 197 (Advanced Encryption
// Standard), the authoritative AES specification:
//   https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.197-upd1.pdf
//
// Appendix B: complete worked example (key expansion + one encrypt/decrypt).
// Appendix C.1: AES-128 known-answer test.
// Section 5.2: key-schedule intermediate values for the Appendix B key.
// Section 4.3: MixColumns worked example.

#pragma once

#include <array>
#include <cstdint>

namespace fips197 {

struct KatVector {
    std::array<std::uint8_t, 16> key;
    std::array<std::uint8_t, 16> plaintext;
    std::array<std::uint8_t, 16> ciphertext;
};

// FIPS 197 Appendix C.1 — AES-128 known-answer test.
inline constexpr KatVector kAppendixC1{
    {{0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f}},
    {{0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff}},
    {{0x69, 0xc4, 0xe0, 0xd8, 0x6a, 0x7b, 0x04, 0x30, 0xd8, 0xcd, 0xb7, 0x80, 0x70, 0xb4, 0xc5, 0x5a}}};

// FIPS 197 Appendix B — the fully worked example (also used for the
// key-schedule intermediate values below).
inline constexpr KatVector kAppendixB{
    {{0x2b, 0x7e, 0x15, 0x16, 0x28, 0xae, 0xd2, 0xa6, 0xab, 0xf7, 0x15, 0x88, 0x09, 0xcf, 0x4f, 0x3c}},
    {{0x32, 0x43, 0xf6, 0xa8, 0x88, 0x5a, 0x30, 0x8d, 0x31, 0x31, 0x98, 0xa2, 0xe0, 0x37, 0x07, 0x34}},
    {{0x39, 0x25, 0x84, 0x1d, 0x02, 0xdc, 0x09, 0xfb, 0xdc, 0x11, 0x85, 0x97, 0x19, 0x6a, 0x0b, 0x32}}};

// FIPS 197 §5.2 — first expanded word of the Appendix B key schedule:
// w[4] = a0fafe17 (the first word after the original key words w[0..3]).
inline constexpr std::array<std::uint8_t, 4> kFirstExpandedWord{0xa0, 0xfa, 0xfe, 0x17};

// FIPS 197 §5.2 — final round key (round key 10) of the Appendix B key
// schedule: d014f9a8 c9ee2589 e13f0cc8 b6630ca6.
inline constexpr std::array<std::uint8_t, 16> kFinalRoundKey{
    {0xd0, 0x14, 0xf9, 0xa8, 0xc9, 0xee, 0x25, 0x89, 0xe1, 0x3f, 0x0c, 0xc8, 0xb6, 0x63, 0x0c, 0xa6}};

// FIPS 197 §4.3 — MixColumns worked example: the column {db, 13, 53, 45}
// maps to {8e, 4d, a1, bc}.
inline constexpr std::array<std::uint8_t, 4> kMixColumnsInput{0xdb, 0x13, 0x53, 0x45};
inline constexpr std::array<std::uint8_t, 4> kMixColumnsExpected{0x8e, 0x4d, 0xa1, 0xbc};

// FIPS 197 §3.4.1 — SubBytes spot values.
inline constexpr std::uint8_t kSbox00 = 0x63; // S(00) = 63
inline constexpr std::uint8_t kSbox01 = 0x7c; // S(01) = 7c
inline constexpr std::uint8_t kSbox53 = 0xed; // S(53) = ed

} // namespace fips197
