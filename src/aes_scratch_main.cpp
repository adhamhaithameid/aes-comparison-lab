// aes_scratch_main.cpp
//
// Command-line interface for Implementation A (from-scratch AES-128).
//
// Subcommands:
//   kat                  Run FIPS 197 known-answer tests and print results.
//   encrypt-block        Encrypt one 16-byte block (hex key + hex input).
//   decrypt-block        Decrypt one 16-byte block.
//   expand-key           Print the 11 round keys for a 16-byte key.
//   roundtrace           Print the state after each transformation of each
//                        round (educational; compare with FIPS 197 App. B).
//
// SECURITY NOTE: this tool exposes the raw block cipher only. It does NOT
// provide authenticated encryption and must not be used to protect real data.

#include "aes_core.hpp"
#include "fips197_vectors.h"

#include <cstring>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <string>

namespace {

std::string to_hex(const std::uint8_t* data, std::size_t len) {
    std::ostringstream os;
    for (std::size_t i = 0; i < len; ++i) {
        os << std::hex << std::setw(2) << std::setfill('0')
           << static_cast<int>(data[i]);
    }
    return os.str();
}

bool from_hex(const std::string& hex, std::uint8_t* out, std::size_t expected_len) {
    if (hex.size() != expected_len * 2) return false;
    auto nib = [](char c) -> int {
        if (c >= '0' && c <= '9') return c - '0';
        if (c >= 'a' && c <= 'f') return c - 'a' + 10;
        if (c >= 'A' && c <= 'F') return c - 'A' + 10;
        return -1;
    };
    for (std::size_t i = 0; i < expected_len; ++i) {
        int hi = nib(hex[2 * i]), lo = nib(hex[2 * i + 1]);
        if (hi < 0 || lo < 0) return false;
        out[i] = static_cast<std::uint8_t>((hi << 4) | lo);
    }
    return true;
}

int cmd_kat() {
    int failures = 0;
    auto run = [&](const char* name, const fips197::KatVector& v) {
        aes::AES128 cipher(v.key);
        aes::Block pt = v.plaintext;
        cipher.encrypt_block(pt);
        bool enc_ok = to_hex(pt.data(), 16) == to_hex(v.ciphertext.data(), 16);
        cipher.decrypt_block(pt);
        bool dec_ok = to_hex(pt.data(), 16) == to_hex(v.plaintext.data(), 16);
        std::cout << name << ": encrypt=" << (enc_ok ? "PASS" : "FAIL")
                  << " decrypt=" << (dec_ok ? "PASS" : "FAIL") << "\n";
        if (!enc_ok || !dec_ok) ++failures;
    };
    run("FIPS 197 Appendix C.1 (AES-128 KAT)", fips197::kAppendixC1);
    run("FIPS 197 Appendix B   (worked example)", fips197::kAppendixB);

    // Key expansion spot values.
    aes::RoundKeySchedule rk{};
    aes::AES128::expand_key(fips197::kAppendixB.key.data(), 16, rk);
    bool w4_ok = to_hex(rk.data() + 16, 4) == to_hex(fips197::kFirstExpandedWord.data(), 4);
    bool rk10_ok = to_hex(rk.data() + 160, 16) == to_hex(fips197::kFinalRoundKey.data(), 16);
    std::cout << "Key expansion: w[4]=" << (w4_ok ? "PASS" : "FAIL")
              << " round_key[10]=" << (rk10_ok ? "PASS" : "FAIL") << "\n";
    if (!w4_ok || !rk10_ok) ++failures;

    std::cout << (failures == 0 ? "ALL KATs PASSED\n" : "KAT FAILURES\n");
    return failures == 0 ? 0 : 1;
}

int cmd_encrypt_block(const std::string& key_hex, const std::string& input_hex) {
    aes::Key128 key{};
    aes::Block block{};
    if (!from_hex(key_hex, key.data(), 16)) {
        std::cerr << "error: key must be 32 hex characters (16 bytes)\n";
        return 2;
    }
    if (!from_hex(input_hex, block.data(), 16)) {
        std::cerr << "error: input must be 32 hex characters (one 16-byte block)\n";
        return 2;
    }
    aes::AES128 cipher(key);
    cipher.encrypt_block(block);
    std::cout << to_hex(block.data(), 16) << "\n";
    return 0;
}

int cmd_decrypt_block(const std::string& key_hex, const std::string& input_hex) {
    aes::Key128 key{};
    aes::Block block{};
    if (!from_hex(key_hex, key.data(), 16)) {
        std::cerr << "error: key must be 32 hex characters (16 bytes)\n";
        return 2;
    }
    if (!from_hex(input_hex, block.data(), 16)) {
        std::cerr << "error: input must be 32 hex characters (one 16-byte block)\n";
        return 2;
    }
    aes::AES128 cipher(key);
    cipher.decrypt_block(block);
    std::cout << to_hex(block.data(), 16) << "\n";
    return 0;
}

int cmd_expand_key(const std::string& key_hex) {
    aes::Key128 key{};
    if (!from_hex(key_hex, key.data(), 16)) {
        std::cerr << "error: key must be 32 hex characters (16 bytes)\n";
        return 2;
    }
    aes::RoundKeySchedule rk{};
    aes::AES128::expand_key(key.data(), 16, rk);
    for (int r = 0; r <= 10; ++r) {
        std::cout << "round " << std::setw(2) << std::setfill('0') << r << ": "
                  << to_hex(rk.data() + 16 * r, 16) << "\n";
    }
    return 0;
}

int cmd_roundtrace(const std::string& key_hex, const std::string& input_hex) {
    aes::Key128 key{};
    aes::Block state{};
    if (!from_hex(key_hex, key.data(), 16)) {
        std::cerr << "error: key must be 32 hex characters (16 bytes)\n";
        return 2;
    }
    if (!from_hex(input_hex, state.data(), 16)) {
        std::cerr << "error: input must be 32 hex characters (one 16-byte block)\n";
        return 2;
    }
    aes::AES128 cipher(key);
    const auto& rk = cipher.round_keys();

    std::cout << "input:      " << to_hex(state.data(), 16) << "\n";
    aes::AES128::add_round_key(state, rk.data());
    std::cout << "round  0 AddRoundKey\n";

    for (int round = 1; round <= 10; ++round) {
        aes::AES128::sub_bytes(state);
        std::cout << "round " << std::setw(2) << round << " SubBytes:    "
                  << to_hex(state.data(), 16) << "\n";
        aes::AES128::shift_rows(state);
        std::cout << "round " << std::setw(2) << round << " ShiftRows:   "
                  << to_hex(state.data(), 16) << "\n";
        if (round < 10) {
            aes::AES128::mix_columns(state);
            std::cout << "round " << std::setw(2) << round << " MixColumns:  "
                      << to_hex(state.data(), 16) << "\n";
        }
        aes::AES128::add_round_key(state, rk.data() + 16 * round);
        std::cout << "round " << std::setw(2) << round << " AddRoundKey: "
                  << to_hex(state.data(), 16) << "\n";
    }
    return 0;
}

void print_usage() {
    std::cout <<
        "AES-128 from scratch — block cipher demonstration tool\n"
        "\n"
        "Usage:\n"
        "  aes_scratch kat\n"
        "  aes_scratch encrypt-block --key HEX16 --input HEX16\n"
        "  aes_scratch decrypt-block --key HEX16 --input HEX16\n"
        "  aes_scratch expand-key --key HEX16\n"
        "  aes_scratch roundtrace --key HEX16 --input HEX16\n"
        "\n"
        "This tool exposes the raw AES block cipher for education and\n"
        "validation. It provides NO authentication and must not be used to\n"
        "encrypt real data. Use aes_openssl (AES-128-GCM) for that.\n";
}

} // namespace

int main(int argc, char** argv) {
    if (argc < 2) {
        print_usage();
        return 2;
    }
    std::string cmd = argv[1];

    auto need_flag = [&](int idx, const char* name) -> std::string {
        if (idx >= argc) {
            std::cerr << "error: missing --" << name << " value\n";
            std::exit(2);
        }
        return argv[idx];
    };

    if (cmd == "kat") {
        return cmd_kat();
    } else if (cmd == "encrypt-block" || cmd == "decrypt-block") {
        std::string key, input;
        for (int i = 2; i < argc; ++i) {
            if (std::strcmp(argv[i], "--key") == 0) key = need_flag(i + 1, "key"), ++i;
            else if (std::strcmp(argv[i], "--input") == 0) input = need_flag(i + 1, "input"), ++i;
        }
        if (key.empty() || input.empty()) {
            std::cerr << "error: --key and --input are required\n";
            return 2;
        }
        return cmd == "encrypt-block" ? cmd_encrypt_block(key, input)
                                       : cmd_decrypt_block(key, input);
    } else if (cmd == "expand-key" || cmd == "roundtrace") {
        std::string key, input;
        for (int i = 2; i < argc; ++i) {
            if (std::strcmp(argv[i], "--key") == 0) key = need_flag(i + 1, "key"), ++i;
            else if (std::strcmp(argv[i], "--input") == 0) input = need_flag(i + 1, "input"), ++i;
        }
        if (key.empty()) {
            std::cerr << "error: --key is required\n";
            return 2;
        }
        if (cmd == "expand-key") return cmd_expand_key(key);
        if (input.empty()) {
            std::cerr << "error: --input is required\n";
            return 2;
        }
        return cmd_roundtrace(key, input);
    } else {
        print_usage();
        return 2;
    }
}
