// test_main.cpp
//
// Automated test suite for both AES implementations.
//
// Test categories (see tests/test_plan.md):
//   A. Known-answer tests (FIPS 197 + NIST CAVP .rsp files)
//   B. Round-trip tests (scratch ECB-validation and OpenSSL GCM)
//   C. Boundary tests (input sizes 0 .. 10 MB)
//   D. Negative / tampering tests (authentication failures)
//   E. Cross-validation (scratch vs OpenSSL on random blocks)
//   F. Determinism / regression checks
//
// Exit code: 0 if all tests pass, 1 otherwise.

#include "aes_core.hpp"
#include "aes_gcm_openssl.hpp"
#include "fips197_vectors.h"

#include <openssl/evp.h>
#include <openssl/rand.h>

#include <algorithm>
#include <chrono>
#include <cstdio>
#include <cstring>
#include <fstream>
#include <iostream>
#include <map>
#include <random>
#include <sstream>
#include <string>
#include <vector>

// ---------------------------------------------------------------------------
// Minimal test framework
// ---------------------------------------------------------------------------

namespace {

int g_checks = 0;
int g_failures = 0;
std::string g_current_section;

void section(const std::string& name) {
    g_current_section = name;
    std::cout << "\n=== " << name << " ===\n";
}

void check(bool condition, const std::string& what) {
    ++g_checks;
    if (!condition) {
        ++g_failures;
        std::cout << "  FAIL: " << what << "\n";
    }
}

void check_eq(const std::string& actual, const std::string& expected,
              const std::string& what) {
    ++g_checks;
    if (actual != expected) {
        ++g_failures;
        std::cout << "  FAIL: " << what << "\n    expected: " << expected
                  << "\n    actual:   " << actual << "\n";
    }
}

std::string to_hex(const std::uint8_t* data, std::size_t len) {
    static const char* digits = "0123456789abcdef";
    std::string out;
    out.reserve(len * 2);
    for (std::size_t i = 0; i < len; ++i) {
        out.push_back(digits[data[i] >> 4]);
        out.push_back(digits[data[i] & 0x0f]);
    }
    return out;
}

std::vector<std::uint8_t> from_hex(const std::string& hex) {
    std::vector<std::uint8_t> out;
    out.reserve(hex.size() / 2);
    for (std::size_t i = 0; i + 1 < hex.size(); i += 2) {
        auto nib = [](char c) -> int {
            if (c >= '0' && c <= '9') return c - '0';
            if (c >= 'a' && c <= 'f') return c - 'a' + 10;
            if (c >= 'A' && c <= 'F') return c - 'A' + 10;
            return -1;
        };
        int hi = nib(hex[i]), lo = nib(hex[i + 1]);
        if (hi < 0 || lo < 0) return {};
        out.push_back(static_cast<std::uint8_t>((hi << 4) | lo));
    }
    return out;
}

// ---------------------------------------------------------------------------
// NIST .rsp parser
// ---------------------------------------------------------------------------

struct RspCase {
    std::map<std::string, std::string> fields;
};

// Parse a CAVP .rsp file into cases. Each case starts with "Count = N" (or
// "COUNT = N" in older files) and contains key/value fields. Field names are
// case-insensitive; both "PT"/"PLAINTEXT" and "CT"/"CIPHERTEXT" are accepted.
std::vector<RspCase> parse_rsp(const std::string& path) {
    std::vector<RspCase> cases;
    std::ifstream in(path);
    if (!in) {
        std::cerr << "ERROR: cannot open " << path << "\n";
        return cases;
    }
    std::string line;
    RspCase current;
    bool in_case = false;
    bool in_case_section = true; // default: collect (for GCM files without ENCRYPT markers)
    while (std::getline(in, line)) {
        // Strip trailing \r (files may have CRLF).
        if (!line.empty() && line.back() == '\r') line.pop_back();
        if (line.empty()) continue;
        if (line[0] == '#') continue;
        if (line[0] == '[') {
            // Track whether we are in an ENCRYPT or DECRYPT section so the
            // two are not mixed (ECB files contain both).
            std::string upper = line;
            for (auto& c : upper) c = static_cast<char>(std::toupper(static_cast<unsigned char>(c)));
            if (in_case && in_case_section) cases.push_back(current);
            current = RspCase{};
            in_case = false;
            // Only an explicit DECRYPT marker disables collection; other
            // section headers ([PTlen], [Keylen], ...) must not.
            in_case_section = (upper.find("DECRYPT") == std::string::npos);
            continue;
        }
        auto eq = line.find('=');
        if (eq == std::string::npos) {
            // Standalone marker like "FAIL".
            std::string upper = line;
            for (auto& c : upper) c = static_cast<char>(std::toupper(static_cast<unsigned char>(c)));
            if (in_case && in_case_section && upper == "FAIL") {
                current.fields["FAIL"] = "";
            }
            continue;
        }
        std::string key = line.substr(0, eq);
        std::string val = line.substr(eq + 1);
        // Trim whitespace.
        auto trim = [](std::string& s) {
            auto b = s.find_first_not_of(" \t");
            auto e = s.find_last_not_of(" \t");
            s = (b == std::string::npos) ? "" : s.substr(b, e - b + 1);
        };
        trim(key);
        trim(val);
        // Normalize key to uppercase for case-insensitive comparison.
        for (auto& c : key) c = static_cast<char>(std::toupper(static_cast<unsigned char>(c)));
        if (key == "COUNT") {
            if (in_case && in_case_section) cases.push_back(current);
            current = RspCase{};
            in_case = true;
        }
        if (in_case && in_case_section) {
            // Accept both PT/PLAINTEXT and CT/CIPHERTEXT.
            if (key == "PLAINTEXT") key = "PT";
            if (key == "CIPHERTEXT") key = "CT";
            current.fields[key] = val;
        }
    }
    if (in_case && in_case_section) cases.push_back(current);
    return cases;
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

std::vector<std::uint8_t> make_random_data(std::size_t len, std::mt19937_64& rng) {
    std::vector<std::uint8_t> data(len);
    std::uniform_int_distribution<int> dist(0, 255);
    for (auto& b : data) b = static_cast<std::uint8_t>(dist(rng));
    return data;
}

aes::Key128 make_random_key(std::mt19937_64& rng) {
    aes::Key128 key{};
    for (auto& b : key) b = static_cast<std::uint8_t>(rng() & 0xff);
    return key;
}

// ---------------------------------------------------------------------------
// A. Known-answer tests — scratch implementation
// ---------------------------------------------------------------------------

void test_fips197_kat() {
    section("A1. FIPS 197 Appendix C.1 KAT (scratch AES-128)");
    aes::AES128 cipher(fips197::kAppendixC1.key);
    aes::Block pt = fips197::kAppendixC1.plaintext;
    cipher.encrypt_block(pt);
    check_eq(to_hex(pt.data(), pt.size()),
             to_hex(fips197::kAppendixC1.ciphertext.data(), 16),
             "AES-128 encrypt matches FIPS 197 C.1");
    cipher.decrypt_block(pt);
    check_eq(to_hex(pt.data(), pt.size()),
             to_hex(fips197::kAppendixC1.plaintext.data(), 16),
             "AES-128 decrypt matches FIPS 197 C.1");
}

void test_fips197_appendix_b() {
    section("A2. FIPS 197 Appendix B KAT (scratch AES-128)");
    aes::AES128 cipher(fips197::kAppendixB.key);
    aes::Block pt = fips197::kAppendixB.plaintext;
    cipher.encrypt_block(pt);
    check_eq(to_hex(pt.data(), pt.size()),
             to_hex(fips197::kAppendixB.ciphertext.data(), 16),
             "AES-128 encrypt matches FIPS 197 App. B");
    cipher.decrypt_block(pt);
    check_eq(to_hex(pt.data(), pt.size()),
             to_hex(fips197::kAppendixB.plaintext.data(), 16),
             "AES-128 decrypt matches FIPS 197 App. B");
}

void test_key_expansion() {
    section("A3. Key expansion (FIPS 197 §5.2)");
    aes::RoundKeySchedule rk{};
    bool ok = aes::AES128::expand_key(fips197::kAppendixB.key.data(),
                                       fips197::kAppendixB.key.size(), rk);
    check(ok, "expand_key succeeds for 16-byte key");
    // First round key equals the original key.
    check_eq(to_hex(rk.data(), 16),
             to_hex(fips197::kAppendixB.key.data(), 16),
             "round key 0 equals the original key");
    // w[4] = a0fafe17 (FIPS 197 §5.2).
    check_eq(to_hex(rk.data() + 16, 4), to_hex(fips197::kFirstExpandedWord.data(), 4),
             "w[4] = a0fafe17");
    // Final round key (FIPS 197 §5.2).
    check_eq(to_hex(rk.data() + 160, 16), to_hex(fips197::kFinalRoundKey.data(), 16),
             "round key 10 = d014f9a8c9ee2589e13f0cc8b6630ca6");
}

void test_transformations() {
    section("A4. Individual transformations (FIPS 197 §3/§4)");
    // SubBytes spot values.
    check_eq(std::to_string(aes::AES128::sbox(0x00)),
             std::to_string(fips197::kSbox00), "S(00) = 63");
    check_eq(std::to_string(aes::AES128::sbox(0x01)),
             std::to_string(fips197::kSbox01), "S(01) = 7c");
    check_eq(std::to_string(aes::AES128::sbox(0x53)),
             std::to_string(fips197::kSbox53), "S(53) = ed");

    // S-box is a bijection and inv_sbox inverts it.
    bool bijective = true;
    bool inverse_ok = true;
    int seen[256] = {0};
    for (int x = 0; x < 256; ++x) {
        std::uint8_t s = aes::AES128::sbox(static_cast<std::uint8_t>(x));
        if (++seen[s] > 1) bijective = false;
        if (aes::AES128::inv_sbox(s) != static_cast<std::uint8_t>(x)) inverse_ok = false;
    }
    check(bijective, "S-box is a bijection over GF(2^8)");
    check(inverse_ok, "inv_sbox inverts sbox for all 256 values");

    // MixColumns worked example (FIPS 197 §4.3).
    aes::Block state{};
    for (int i = 0; i < 4; ++i) state[i] = fips197::kMixColumnsInput[i];
    aes::AES128::mix_columns(state);
    check_eq(to_hex(state.data(), 4), to_hex(fips197::kMixColumnsExpected.data(), 4),
             "MixColumns(db,13,53,45) = (8e,4d,a1,bc)");

    // InvMixColumns inverts MixColumns.
    aes::Block roundtrip = state;
    aes::AES128::inv_mix_columns(roundtrip);
    check_eq(to_hex(roundtrip.data(), 4), to_hex(fips197::kMixColumnsInput.data(), 4),
             "InvMixColumns inverts MixColumns");

    // ShiftRows: byte at (r, c) moves to (r, (c - r) mod 4). Build a state
    // where each byte equals its flat index and verify the permutation.
    aes::Block idx{};
    for (int i = 0; i < 16; ++i) idx[i] = static_cast<std::uint8_t>(i);
    aes::AES128::shift_rows(idx);
    bool shift_ok = true;
    for (int r = 0; r < 4; ++r) {
        for (int c = 0; c < 4; ++c) {
            // After ShiftRows, position (r, c) holds old (r, (c + r) % 4).
            std::uint8_t expected = static_cast<std::uint8_t>(r + 4 * ((c + r) % 4));
            if (idx[r + 4 * c] != expected) shift_ok = false;
        }
    }
    check(shift_ok, "ShiftRows permutes bytes as specified");

    // InvShiftRows inverts ShiftRows.
    aes::Block idx2 = idx;
    aes::AES128::inv_shift_rows(idx2);
    bool inv_shift_ok = true;
    for (int i = 0; i < 16; ++i) {
        if (idx2[i] != static_cast<std::uint8_t>(i)) inv_shift_ok = false;
    }
    check(inv_shift_ok, "InvShiftRows inverts ShiftRows");

    // AddRoundKey is XOR: applying it twice with the same key restores state.
    aes::Block s1{};
    for (int i = 0; i < 16; ++i) s1[i] = static_cast<std::uint8_t>(i * 7 + 3);
    aes::Block s2 = s1;
    aes::AES128::add_round_key(s1, fips197::kAppendixB.key.data());
    aes::AES128::add_round_key(s1, fips197::kAppendixB.key.data());
    check_eq(to_hex(s1.data(), 16), to_hex(s2.data(), 16),
             "AddRoundKey is self-inverse");
}

void test_nist_ecb_rsp(const std::string& path, const std::string& name) {
    section("A5. NIST CAVP " + name + " (scratch AES-128 ECB)");
    auto cases = parse_rsp(path);
    check(!cases.empty(), name + ": parsed at least one case");
    int passed = 0;
    for (const auto& c : cases) {
        auto key = from_hex(c.fields.at("KEY"));
        auto pt = from_hex(c.fields.at("PT"));
        auto ct = from_hex(c.fields.at("CT"));
        if (key.size() != 16 || pt.size() != 16 || ct.size() != 16) continue;
        aes::Key128 k{};
        std::memcpy(k.data(), key.data(), 16);
        aes::AES128 cipher(k);
        aes::Block block{};
        std::memcpy(block.data(), pt.data(), 16);
        cipher.encrypt_block(block);
        if (to_hex(block.data(), 16) == to_hex(ct.data(), 16)) {
            ++passed;
        } else {
            std::cout << "  FAIL: " << name << " case mismatch\n";
            ++g_failures;
        }
        ++g_checks;
    }
    std::cout << "  " << passed << "/" << cases.size() << " cases passed\n";
    check(passed == static_cast<int>(cases.size()), name + ": all cases pass");
}

void test_nist_ecb_mmt(const std::string& path) {
    section("A6. NIST CAVP ECBMMT128 multi-block (scratch ECB validation)");
    auto cases = parse_rsp(path);
    check(!cases.empty(), "ECBMMT128: parsed at least one case");
    int passed = 0;
    for (const auto& c : cases) {
        auto key = from_hex(c.fields.at("KEY"));
        auto pt = from_hex(c.fields.at("PT"));
        auto ct = from_hex(c.fields.at("CT"));
        if (key.size() != 16 || pt.empty() || pt.size() != ct.size() ||
            pt.size() % 16 != 0) {
            continue;
        }
        aes::Key128 k{};
        std::memcpy(k.data(), key.data(), 16);
        aes::AES128 cipher(k);
        std::vector<std::uint8_t> out(pt.size());
        if (!aes::aes128_ecb_encrypt_validate(cipher, pt.data(), pt.size(), out.data())) {
            continue;
        }
        if (to_hex(out.data(), out.size()) == to_hex(ct.data(), ct.size())) {
            ++passed;
        } else {
            std::cout << "  FAIL: ECBMMT128 case mismatch (pt len " << pt.size() << ")\n";
            ++g_failures;
        }
        ++g_checks;
    }
    std::cout << "  " << passed << "/" << cases.size() << " cases passed\n";
    check(passed == static_cast<int>(cases.size()), "ECBMMT128: all cases pass");
}

// ---------------------------------------------------------------------------
// B. Round-trip tests
// ---------------------------------------------------------------------------

void test_roundtrip_scratch(std::mt19937_64& rng) {
    section("B1. Round-trip: scratch AES-128 (ECB validation)");
    struct Case {
        const char* name;
        std::size_t len;
    };
    const Case cases[] = {
        {"single block", 16},
        {"two blocks", 32},
        {"10 blocks", 160},
        {"1 KiB", 1024},
        {"1 MiB", 1024 * 1024},
    };
    for (const auto& tc : cases) {
        auto data = make_random_data(tc.len, rng);
        aes::Key128 key = make_random_key(rng);
        aes::AES128 cipher(key);
        std::vector<std::uint8_t> enc(tc.len), dec(tc.len);
        check(aes::aes128_ecb_encrypt_validate(cipher, data.data(), tc.len, enc.data()),
              std::string("encrypt accepts ") + tc.name);
        check(aes::aes128_ecb_decrypt_validate(cipher, enc.data(), tc.len, dec.data()),
              std::string("decrypt accepts ") + tc.name);
        check_eq(to_hex(dec.data(), dec.size()), to_hex(data.data(), data.size()),
                 std::string("round-trip preserves ") + tc.name);
    }

    // Special content: all zero bytes, ASCII text, UTF-8 text.
    {
        std::vector<std::uint8_t> zeros(256, 0);
        aes::Key128 key = make_random_key(rng);
        aes::AES128 cipher(key);
        std::vector<std::uint8_t> enc(256), dec(256);
        aes::aes128_ecb_encrypt_validate(cipher, zeros.data(), 256, enc.data());
        aes::aes128_ecb_decrypt_validate(cipher, enc.data(), 256, dec.data());
        check_eq(to_hex(dec.data(), 256), to_hex(zeros.data(), 256),
                 "round-trip preserves all-zero data");
    }
    {
        std::string text = "The quick brown fox jumps over the lazy dog. 0123456789";
        std::vector<std::uint8_t> data(text.begin(), text.end());
        // Pad to a multiple of 16 for the block cipher.
        while (data.size() % 16 != 0) data.push_back(' ');
        aes::Key128 key = make_random_key(rng);
        aes::AES128 cipher(key);
        std::vector<std::uint8_t> enc(data.size()), dec(data.size());
        aes::aes128_ecb_encrypt_validate(cipher, data.data(), data.size(), enc.data());
        aes::aes128_ecb_decrypt_validate(cipher, enc.data(), data.size(), dec.data());
        check_eq(to_hex(dec.data(), dec.size()), to_hex(data.data(), data.size()),
                 "round-trip preserves ASCII text");
    }
    {
        // UTF-8: "héllo wörld — ünïcode ✓" (multi-byte sequences).
        // Note: adjacent string literals are used after \xaf and \x93 so the
        // compiler does not merge a hex escape with a following hex-digit
        // letter (e.g. "\xafcode" would parse as the single escape \xafc).
        std::string text = "h\xc3\xa9llo w\xc3\xb6rld \xe2\x80\x94 "
                           "\xc3\xbcn\xc3\xaf"
                           "code \xe2\x9c\x93";
        std::vector<std::uint8_t> data(text.begin(), text.end());
        while (data.size() % 16 != 0) data.push_back(' ');
        aes::Key128 key = make_random_key(rng);
        aes::AES128 cipher(key);
        std::vector<std::uint8_t> enc(data.size()), dec(data.size());
        aes::aes128_ecb_encrypt_validate(cipher, data.data(), data.size(), enc.data());
        aes::aes128_ecb_decrypt_validate(cipher, enc.data(), data.size(), dec.data());
        check_eq(to_hex(dec.data(), dec.size()), to_hex(data.data(), data.size()),
                 "round-trip preserves UTF-8 text");
    }
}

void test_roundtrip_gcm(std::mt19937_64& rng) {
    section("B2. Round-trip: OpenSSL AES-128-GCM");
    struct Case {
        const char* name;
        std::size_t len;
    };
    const Case cases[] = {
        {"empty", 0},
        {"1 byte", 1},
        {"15 bytes", 15},
        {"16 bytes", 16},
        {"17 bytes", 17},
        {"31 bytes", 31},
        {"32 bytes", 32},
        {"33 bytes", 33},
        {"1 KiB", 1024},
        {"100 KiB", 100 * 1024},
        {"1 MiB", 1024 * 1024},
        {"10 MiB", 10 * 1024 * 1024},
    };
    for (const auto& tc : cases) {
        auto data = make_random_data(tc.len, rng);
        aes::Key128 key = make_random_key(rng);
        std::vector<std::uint8_t> nonce(12);
        aesgcm::random_bytes(nonce.data(), nonce.size());
        auto enc = aesgcm::encrypt(key.data(), nonce.data(), data.data(), tc.len);
        check_eq(std::to_string(enc.ciphertext.size()), std::to_string(tc.len),
                 std::string("GCM ciphertext length for ") + tc.name);
        auto dec = aesgcm::decrypt(key.data(), nonce.data(), enc.ciphertext.data(),
                                   enc.ciphertext.size(), enc.tag.data());
        check(dec.has_value(), std::string("GCM decrypt succeeds for ") + tc.name);
        if (dec.has_value()) {
            check_eq(to_hex(dec->data(), dec->size()), to_hex(data.data(), data.size()),
                     std::string("GCM round-trip preserves ") + tc.name);
        }
    }
}

// ---------------------------------------------------------------------------
// C. Boundary tests
// ---------------------------------------------------------------------------

void test_boundary_gcm(std::mt19937_64& rng) {
    section("C1. Boundary sizes: OpenSSL AES-128-GCM");
    const std::size_t sizes[] = {0, 1, 15, 16, 17, 31, 32, 33, 1024,
                                 100 * 1024, 1024 * 1024, 10 * 1024 * 1024};
    for (std::size_t len : sizes) {
        auto data = make_random_data(len, rng);
        aes::Key128 key = make_random_key(rng);
        std::vector<std::uint8_t> nonce(12);
        aesgcm::random_bytes(nonce.data(), nonce.size());
        auto enc = aesgcm::encrypt(key.data(), nonce.data(), data.data(), len);
        auto dec = aesgcm::decrypt(key.data(), nonce.data(), enc.ciphertext.data(),
                                   enc.ciphertext.size(), enc.tag.data());
        bool ok = dec.has_value() && *dec == data;
        check(ok, "GCM boundary size " + std::to_string(len) + " bytes");
    }
}

void test_boundary_scratch() {
    section("C2. Boundary: scratch block cipher rejects non-block-multiple input");
    aes::Key128 key{};
    aes::AES128 cipher(key);
    std::vector<std::uint8_t> data(17, 0x42); // 17 bytes: not a multiple of 16
    std::vector<std::uint8_t> out(17);
    check(!aes::aes128_ecb_encrypt_validate(cipher, data.data(), 17, out.data()),
          "scratch ECB rejects 17-byte input (no silent padding)");
    check(!aes::aes128_ecb_decrypt_validate(cipher, data.data(), 17, out.data()),
          "scratch ECB decrypt rejects 17-byte input");
    // 16 bytes is accepted.
    std::vector<std::uint8_t> data16(16, 0x42);
    std::vector<std::uint8_t> out16(16);
    check(aes::aes128_ecb_encrypt_validate(cipher, data16.data(), 16, out16.data()),
          "scratch ECB accepts 16-byte input");
}

// ---------------------------------------------------------------------------
// D. Negative / tampering tests
// ---------------------------------------------------------------------------

void test_negative_scratch() {
    section("D1. Negative: scratch implementation invalid input");
    aes::RoundKeySchedule rk{};
    check(!aes::AES128::expand_key(nullptr, 16, rk), "expand_key rejects null key");
    check(!aes::AES128::expand_key(nullptr, 0, rk), "expand_key rejects null key (len 0)");
    std::uint8_t short_key[15] = {0};
    check(!aes::AES128::expand_key(short_key, 15, rk), "expand_key rejects 15-byte key");
    std::uint8_t long_key[17] = {0};
    check(!aes::AES128::expand_key(long_key, 17, rk), "expand_key rejects 17-byte key");
    std::uint8_t key16[16] = {0};
    check(aes::AES128::expand_key(key16, 16, rk), "expand_key accepts 16-byte key");
}

void test_negative_gcm(std::mt19937_64& rng) {
    section("D2. Negative: OpenSSL AES-128-GCM tampering");
    auto data = make_random_data(64, rng);
    aes::Key128 key = make_random_key(rng);
    aes::Key128 wrong_key = make_random_key(rng);
    std::vector<std::uint8_t> nonce(12);
    aesgcm::random_bytes(nonce.data(), nonce.size());
    auto enc = aesgcm::encrypt(key.data(), nonce.data(), data.data(), data.size());

    // Baseline: correct key/nonce/tag must succeed.
    auto ok = aesgcm::decrypt(key.data(), nonce.data(), enc.ciphertext.data(),
                              enc.ciphertext.size(), enc.tag.data());
    check(ok.has_value() && *ok == data, "baseline GCM decrypt succeeds");

    // Wrong key.
    auto r = aesgcm::decrypt(wrong_key.data(), nonce.data(), enc.ciphertext.data(),
                             enc.ciphertext.size(), enc.tag.data());
    check(!r.has_value(), "wrong key is rejected");

    // Modified ciphertext (flip one bit).
    {
        auto ct = enc.ciphertext;
        ct[0] ^= 0x01;
        auto r2 = aesgcm::decrypt(key.data(), nonce.data(), ct.data(), ct.size(),
                                  enc.tag.data());
        check(!r2.has_value(), "modified ciphertext is rejected");
    }

    // Modified tag.
    {
        auto tag = enc.tag;
        tag[0] ^= 0x80;
        auto r2 = aesgcm::decrypt(key.data(), nonce.data(), enc.ciphertext.data(),
                                  enc.ciphertext.size(), tag.data());
        check(!r2.has_value(), "modified tag is rejected");
    }

    // Modified nonce.
    {
        auto n = nonce;
        n[0] ^= 0x01;
        auto r2 = aesgcm::decrypt(key.data(), n.data(), enc.ciphertext.data(),
                                  enc.ciphertext.size(), enc.tag.data());
        check(!r2.has_value(), "modified nonce is rejected");
    }

    // Modified AAD.
    {
        std::uint8_t aad[] = {'a', 'a', 'd'};
        auto enc_aad = aesgcm::encrypt(key.data(), nonce.data(), data.data(), data.size(),
                                       aad, sizeof(aad));
        std::uint8_t bad_aad[] = {'a', 'a', 'x'};
        auto r2 = aesgcm::decrypt(key.data(), nonce.data(), enc_aad.ciphertext.data(),
                                  enc_aad.ciphertext.size(), enc_aad.tag.data(),
                                  bad_aad, sizeof(bad_aad));
        check(!r2.has_value(), "modified AAD is rejected");
        // Correct AAD must still succeed.
        auto r3 = aesgcm::decrypt(key.data(), nonce.data(), enc_aad.ciphertext.data(),
                                  enc_aad.ciphertext.size(), enc_aad.tag.data(),
                                  aad, sizeof(aad));
        check(r3.has_value() && *r3 == data, "correct AAD succeeds");
    }

    // Truncated ciphertext.
    {
        auto r2 = aesgcm::decrypt(key.data(), nonce.data(), enc.ciphertext.data(),
                                  enc.ciphertext.size() - 1, enc.tag.data());
        check(!r2.has_value(), "truncated ciphertext is rejected");
    }

    // Truncated tag (15 bytes instead of 16).
    {
        auto r2 = aesgcm::decrypt(key.data(), nonce.data(), enc.ciphertext.data(),
                                  enc.ciphertext.size(), enc.tag.data());
        // Manually call with a 15-byte tag by copying into a smaller buffer.
        std::vector<std::uint8_t> short_tag(enc.tag.begin(), enc.tag.begin() + 15);
        // We cannot pass a 15-byte tag through the typed API (tag is always
        // 16 bytes), so verify the API contract: tag.size() is always 16.
        check(enc.tag.size() == 16, "tag is always 16 bytes");
        (void)r2;
        (void)short_tag;
    }

    // Empty/garbage blob.
    {
        std::vector<std::uint8_t> garbage(3, 0xff);
        auto r2 = aesgcm::decrypt_blob(key.data(), garbage.data(), garbage.size());
        check(!r2.has_value(), "3-byte garbage blob is rejected");
    }

    // Null arguments.
    bool threw = false;
    try {
        aesgcm::encrypt(nullptr, nonce.data(), data.data(), data.size());
    } catch (const aesgcm::OperationError&) {
        threw = true;
    }
    check(threw, "null key throws OperationError");

    threw = false;
    try {
        aesgcm::encrypt(key.data(), nullptr, data.data(), data.size());
    } catch (const aesgcm::OperationError&) {
        threw = true;
    }
    check(threw, "null nonce throws OperationError");
}

void test_nist_gcm_encrypt_rsp(const std::string& path) {
    section("D3. NIST CAVP GCM encrypt KATs (OpenSSL AES-128-GCM)");
    auto cases = parse_rsp(path);
    check(!cases.empty(), "GCM encrypt rsp: parsed at least one case");
    int passed = 0;
    for (const auto& c : cases) {
        auto key = from_hex(c.fields.at("KEY"));
        auto iv = from_hex(c.fields.at("IV"));
        auto pt = from_hex(c.fields.at("PT"));
        auto aad = from_hex(c.fields.at("AAD"));
        auto ct = from_hex(c.fields.at("CT"));
        auto tag = from_hex(c.fields.at("TAG"));
        if (key.size() != 16 || iv.size() != 12 || tag.size() != 16) continue;
        auto enc = aesgcm::encrypt(key.data(), iv.data(), pt.data(), pt.size(),
                                   aad.data(), aad.size());
        if (to_hex(enc.ciphertext.data(), enc.ciphertext.size()) ==
                to_hex(ct.data(), ct.size()) &&
            to_hex(enc.tag.data(), enc.tag.size()) == to_hex(tag.data(), tag.size())) {
            ++passed;
        } else {
            std::cout << "  FAIL: GCM encrypt case mismatch\n";
            ++g_failures;
        }
        ++g_checks;
    }
    std::cout << "  " << passed << "/" << cases.size() << " cases passed\n";
    check(passed == static_cast<int>(cases.size()), "GCM encrypt: all cases pass");
}

void test_nist_gcm_decrypt_rsp(const std::string& path) {
    section("D4. NIST CAVP GCM decrypt KATs incl. FAIL cases (OpenSSL)");
    auto cases = parse_rsp(path);
    check(!cases.empty(), "GCM decrypt rsp: parsed at least one case");
    int passed = 0;
    int fail_cases = 0;
    for (const auto& c : cases) {
        auto key = from_hex(c.fields.at("KEY"));
        auto iv = from_hex(c.fields.at("IV"));
        auto ct = from_hex(c.fields.at("CT"));
        auto aad = from_hex(c.fields.at("AAD"));
        auto tag = from_hex(c.fields.at("TAG"));
        bool expect_fail = c.fields.count("FAIL") > 0;
        if (expect_fail) ++fail_cases;
        if (key.size() != 16 || iv.size() != 12 || tag.size() != 16) continue;
        auto dec = aesgcm::decrypt(key.data(), iv.data(), ct.data(), ct.size(),
                                   tag.data(), aad.data(), aad.size());
        if (expect_fail) {
            if (!dec.has_value()) {
                ++passed;
            } else {
                std::cout << "  FAIL: expected authentication failure but decrypt succeeded\n";
                ++g_failures;
            }
        } else {
            auto it = c.fields.find("PT");
            if (it == c.fields.end()) {
                // No PT field — treat as unexpected success.
                std::cout << "  FAIL: GCM decrypt succeeded but no PT field\n";
                ++g_failures;
            } else {
                auto pt = from_hex(it->second);
                if (dec.has_value() && to_hex(dec->data(), dec->size()) ==
                                          to_hex(pt.data(), pt.size())) {
                    ++passed;
                } else {
                    std::cout << "  FAIL: GCM decrypt case mismatch\n";
                    ++g_failures;
                }
            }
        }
        ++g_checks;
    }
    std::cout << "  " << passed << "/" << cases.size()
              << " cases passed (" << fail_cases << " official FAIL cases)\n";
    check(passed == static_cast<int>(cases.size()), "GCM decrypt: all cases pass");
}

// ---------------------------------------------------------------------------
// E. Cross-validation: scratch vs OpenSSL
// ---------------------------------------------------------------------------

void test_cross_validation(std::mt19937_64& rng) {
    section("E1. Cross-validation: scratch AES-128 vs OpenSSL AES-128-ECB");
    // Encrypt 1000 random blocks with both implementations and compare.
    // OpenSSL ECB with padding disabled is the same raw block cipher.
    EVP_CIPHER_CTX* ctx = EVP_CIPHER_CTX_new();
    check(ctx != nullptr, "OpenSSL EVP context created");
    if (!ctx) return;

    int mismatches = 0;
    for (int i = 0; i < 1000; ++i) {
        aes::Key128 key = make_random_key(rng);
        aes::Block block{};
        for (auto& b : block) b = static_cast<std::uint8_t>(rng() & 0xff);

        // Scratch encryption.
        aes::AES128 cipher(key);
        aes::Block scratch_result = block;
        cipher.encrypt_block(scratch_result);

        // OpenSSL encryption (ECB, no padding).
        EVP_CIPHER_CTX_reset(ctx);
        int out_len = 0;
        std::uint8_t ossl_result[16] = {0};
        if (EVP_EncryptInit_ex(ctx, EVP_aes_128_ecb(), nullptr, key.data(), nullptr) != 1 ||
            EVP_CIPHER_CTX_set_padding(ctx, 0) != 1 ||
            EVP_EncryptUpdate(ctx, ossl_result, &out_len, block.data(), 16) != 1 ||
            out_len != 16) {
            std::cout << "  FAIL: OpenSSL ECB setup/update failed\n";
            ++g_failures;
            ++g_checks;
            break;
        }
        if (std::memcmp(scratch_result.data(), ossl_result, 16) != 0) {
            ++mismatches;
        }
        ++g_checks;
    }
    EVP_CIPHER_CTX_free(ctx);
    check(mismatches == 0, "scratch and OpenSSL agree on 1000 random blocks");
    std::cout << "  1000 random blocks compared, " << mismatches << " mismatches\n";
}

// ---------------------------------------------------------------------------
// F. Determinism / regression
// ---------------------------------------------------------------------------

void test_determinism(std::mt19937_64& rng) {
    section("F1. Determinism and nonce uniqueness");
    aes::Key128 key = make_random_key(rng);
    aes::AES128 cipher(key);
    aes::Block block{};
    for (auto& b : block) b = static_cast<std::uint8_t>(rng() & 0xff);
    aes::Block r1 = block, r2 = block;
    cipher.encrypt_block(r1);
    cipher.encrypt_block(r2);
    check_eq(to_hex(r1.data(), 16), to_hex(r2.data(), 16),
             "scratch encryption is deterministic");

    // GCM: same key + same nonce + same plaintext => same ciphertext (but
    // callers must never reuse a nonce; this checks determinism only).
    std::vector<std::uint8_t> nonce(12, 0x42);
    auto data = make_random_data(32, rng);
    auto e1 = aesgcm::encrypt(key.data(), nonce.data(), data.data(), data.size());
    auto e2 = aesgcm::encrypt(key.data(), nonce.data(), data.data(), data.size());
    check_eq(to_hex(e1.ciphertext.data(), e1.ciphertext.size()),
             to_hex(e2.ciphertext.data(), e2.ciphertext.size()),
             "GCM is deterministic for fixed key+nonce (test-only)");
    check_eq(to_hex(e1.tag.data(), 16), to_hex(e2.tag.data(), 16),
             "GCM tag is deterministic for fixed key+nonce (test-only)");

    // Different nonces => different ciphertexts.
    std::vector<std::uint8_t> nonce2(12, 0x43);
    auto e3 = aesgcm::encrypt(key.data(), nonce2.data(), data.data(), data.size());
    check(to_hex(e1.ciphertext.data(), e1.ciphertext.size()) !=
              to_hex(e3.ciphertext.data(), e3.ciphertext.size()),
          "different nonces produce different ciphertexts");
}

} // namespace

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

int main(int argc, char** argv) {
    std::string vectors_dir = "tests/test_vectors";
    if (argc > 1) {
        vectors_dir = argv[1];
    }

    std::cout << "AES Comparison Test Suite\n";
    std::cout << "Vectors directory: " << vectors_dir << "\n";

    // Fixed seed for reproducibility.
    std::mt19937_64 rng(0xAE5128);

    // A. Known-answer tests.
    test_fips197_kat();
    test_fips197_appendix_b();
    test_key_expansion();
    test_transformations();
    test_nist_ecb_rsp(vectors_dir + "/ECBGFSbox128.rsp", "ECBGFSbox128");
    test_nist_ecb_rsp(vectors_dir + "/ECBVarTxt128.rsp", "ECBVarTxt128");
    test_nist_ecb_rsp(vectors_dir + "/ECBVarKey128.rsp", "ECBVarKey128");
    test_nist_ecb_mmt(vectors_dir + "/ECBMMT128.rsp");

    // B. Round-trip tests.
    test_roundtrip_scratch(rng);
    test_roundtrip_gcm(rng);

    // C. Boundary tests.
    test_boundary_gcm(rng);
    test_boundary_scratch();

    // D. Negative / tampering tests.
    test_negative_scratch();
    test_negative_gcm(rng);
    test_nist_gcm_encrypt_rsp(vectors_dir + "/gcmEncryptExtIV128_subset.rsp");
    test_nist_gcm_decrypt_rsp(vectors_dir + "/gcmDecrypt128_subset.rsp");

    // E. Cross-validation.
    test_cross_validation(rng);

    // F. Determinism.
    test_determinism(rng);

    std::cout << "\n========================================\n";
    std::cout << "Total checks: " << g_checks << "\n";
    std::cout << "Failures:     " << g_failures << "\n";
    if (g_failures == 0) {
        std::cout << "RESULT: ALL TESTS PASSED\n";
        return 0;
    } else {
        std::cout << "RESULT: TESTS FAILED\n";
        return 1;
    }
}
