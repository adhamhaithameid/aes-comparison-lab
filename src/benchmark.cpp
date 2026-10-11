// benchmark.cpp
//
// Performance benchmark comparing:
//   - scratch AES-128 (from-scratch block cipher, ECB-style per-block)
//   - OpenSSL AES-128-ECB (raw block cipher, for apples-to-apples comparison)
//   - OpenSSL AES-128-GCM (authenticated encryption, reported separately)
//
// Usage:
//   aes_benchmark --impl scratch|openssl-ecb|openssl-gcm \
//                 --op encrypt|decrypt|keysetup \
//                 --size N --reps R --warmup W \
//                 --csv out.csv [--label Release]
//
// Each repetition is timed individually with std::chrono::steady_clock and
// written as one CSV row. Throughput is computed as size / (1024*1024) /
// elapsed_seconds (MiB/s).

#include "aes_core.hpp"
#include "aes_gcm_openssl.hpp"

#include <openssl/evp.h>
#include <openssl/rand.h>

#include <algorithm>
#include <chrono>
#include <cstdio>
#include <cstring>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <random>
#include <sstream>
#include <string>
#include <vector>

namespace {

struct Args {
    std::string impl;
    std::string op;
    std::size_t size = 0;
    int reps = 10;
    int warmup = 3;
    std::string csv_path;
    std::string label = "Release";
};

Args parse_args(int argc, char** argv) {
    Args a;
    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];
        auto next = [&](const char* name) -> std::string {
            if (i + 1 >= argc) {
                std::cerr << "error: --" << name << " requires a value\n";
                std::exit(2);
            }
            return argv[++i];
        };
        if (arg == "--impl") a.impl = next("impl");
        else if (arg == "--op") a.op = next("op");
        else if (arg == "--size") a.size = std::stoull(next("size"));
        else if (arg == "--reps") a.reps = std::stoi(next("reps"));
        else if (arg == "--warmup") a.warmup = std::stoi(next("warmup"));
        else if (arg == "--csv") a.csv_path = next("csv");
        else if (arg == "--label") a.label = next("label");
        else {
            std::cerr << "error: unknown argument " << arg << "\n";
            std::exit(2);
        }
    }
    if (a.impl.empty() || a.op.empty() || a.csv_path.empty()) {
        std::cerr << "usage: aes_benchmark --impl scratch|openssl-ecb|openssl-gcm "
                     "--op encrypt|decrypt|keysetup --size N --reps R --csv out.csv\n";
        std::exit(2);
    }
    return a;
}

// Prevent the compiler from optimizing away the work: accumulate a checksum
// of the output and expose it via a volatile sink.
volatile std::uint64_t g_sink = 0;

void sink(std::uint64_t v) { g_sink ^= v; }

std::uint64_t checksum(const std::uint8_t* data, std::size_t len) {
    std::uint64_t h = 0xcbf29ce484222325ULL; // FNV-1a
    for (std::size_t i = 0; i < len; ++i) {
        h ^= data[i];
        h *= 0x100000001b3ULL;
    }
    return h;
}

// ---------------------------------------------------------------------------
// Scratch implementation benchmarks
// ---------------------------------------------------------------------------

std::uint64_t bench_scratch_encrypt(const std::vector<std::uint8_t>& data,
                                    const aes::Key128& key, int reps) {
    aes::AES128 cipher(key);
    std::vector<std::uint8_t> out(data.size());
    for (int r = 0; r < reps; ++r) {
        aes::aes128_ecb_encrypt_validate(cipher, data.data(), data.size(), out.data());
        sink(checksum(out.data(), out.size()));
    }
    return 0;
}

std::uint64_t bench_scratch_decrypt(const std::vector<std::uint8_t>& data,
                                    const aes::Key128& key, int reps) {
    aes::AES128 cipher(key);
    std::vector<std::uint8_t> out(data.size());
    for (int r = 0; r < reps; ++r) {
        aes::aes128_ecb_decrypt_validate(cipher, data.data(), data.size(), out.data());
        sink(checksum(out.data(), out.size()));
    }
    return 0;
}

std::uint64_t bench_scratch_keysetup(const aes::Key128& key, int reps) {
    for (int r = 0; r < reps; ++r) {
        aes::RoundKeySchedule rk{};
        aes::AES128::expand_key(key.data(), 16, rk);
        sink(checksum(rk.data(), rk.size()));
    }
    return 0;
}

// ---------------------------------------------------------------------------
// OpenSSL ECB benchmarks (raw block cipher, same operation as scratch)
// ---------------------------------------------------------------------------

std::uint64_t bench_openssl_ecb_encrypt(const std::vector<std::uint8_t>& data,
                                        const aes::Key128& key, int reps) {
    EVP_CIPHER_CTX* ctx = EVP_CIPHER_CTX_new();
    EVP_EncryptInit_ex(ctx, EVP_aes_128_ecb(), nullptr, key.data(), nullptr);
    EVP_CIPHER_CTX_set_padding(ctx, 0);
    std::vector<std::uint8_t> out(data.size());
    for (int r = 0; r < reps; ++r) {
        int outl = 0, total = 0;
        EVP_EncryptUpdate(ctx, out.data(), &outl, data.data(),
                          static_cast<int>(data.size()));
        total += outl;
        EVP_EncryptFinal_ex(ctx, out.data() + total, &outl);
        total += outl;
        sink(checksum(out.data(), out.size()));
    }
    EVP_CIPHER_CTX_free(ctx);
    return 0;
}

std::uint64_t bench_openssl_ecb_decrypt(const std::vector<std::uint8_t>& data,
                                        const aes::Key128& key, int reps) {
    EVP_CIPHER_CTX* ctx = EVP_CIPHER_CTX_new();
    EVP_DecryptInit_ex(ctx, EVP_aes_128_ecb(), nullptr, key.data(), nullptr);
    EVP_CIPHER_CTX_set_padding(ctx, 0);
    std::vector<std::uint8_t> out(data.size());
    for (int r = 0; r < reps; ++r) {
        int outl = 0, total = 0;
        EVP_DecryptUpdate(ctx, out.data(), &outl, data.data(),
                          static_cast<int>(data.size()));
        total += outl;
        EVP_DecryptFinal_ex(ctx, out.data() + total, &outl);
        total += outl;
        sink(checksum(out.data(), out.size()));
    }
    EVP_CIPHER_CTX_free(ctx);
    return 0;
}

std::uint64_t bench_openssl_ecb_keysetup(const aes::Key128& key, int reps) {
    for (int r = 0; r < reps; ++r) {
        EVP_CIPHER_CTX* ctx = EVP_CIPHER_CTX_new();
        EVP_EncryptInit_ex(ctx, EVP_aes_128_ecb(), nullptr, key.data(), nullptr);
        EVP_CIPHER_CTX_free(ctx);
        sink(1);
    }
    return 0;
}

// ---------------------------------------------------------------------------
// OpenSSL GCM benchmarks (authenticated encryption — different operation)
// ---------------------------------------------------------------------------

std::uint64_t bench_openssl_gcm_encrypt(const std::vector<std::uint8_t>& data,
                                        const aes::Key128& key, int reps) {
    for (int r = 0; r < reps; ++r) {
        std::vector<std::uint8_t> nonce(12);
        aesgcm::random_bytes(nonce.data(), nonce.size());
        auto enc = aesgcm::encrypt(key.data(), nonce.data(), data.data(), data.size());
        sink(checksum(enc.ciphertext.data(), enc.ciphertext.size()));
        sink(checksum(enc.tag.data(), enc.tag.size()));
    }
    return 0;
}

std::uint64_t bench_openssl_gcm_decrypt(const std::vector<std::uint8_t>& data,
                                        const aes::Key128& key, int reps) {
    // Pre-encrypt once to get a valid ciphertext+tag.
    std::vector<std::uint8_t> nonce(12);
    aesgcm::random_bytes(nonce.data(), nonce.size());
    auto enc = aesgcm::encrypt(key.data(), nonce.data(), data.data(), data.size());
    for (int r = 0; r < reps; ++r) {
        auto dec = aesgcm::decrypt(key.data(), nonce.data(), enc.ciphertext.data(),
                                   enc.ciphertext.size(), enc.tag.data());
        if (dec.has_value()) {
            sink(checksum(dec->data(), dec->size()));
        }
    }
    return 0;
}

} // namespace

int main(int argc, char** argv) {
    Args args = parse_args(argc, argv);

    // Generate random input data and key.
    std::mt19937_64 rng(0xBEEF);
    std::vector<std::uint8_t> data(args.size);
    for (auto& b : data) b = static_cast<std::uint8_t>(rng() & 0xff);
    aes::Key128 key{};
    for (auto& b : key) b = static_cast<std::uint8_t>(rng() & 0xff);

    // Dispatch to the right benchmark function.
    using Fn = std::uint64_t (*)(const std::vector<std::uint8_t>&, const aes::Key128&, int);
    using FnKey = std::uint64_t (*)(const aes::Key128&, int);
    Fn fn = nullptr;
    FnKey fn_key = nullptr;
    if (args.impl == "scratch") {
        if (args.op == "encrypt") fn = bench_scratch_encrypt;
        else if (args.op == "decrypt") fn = bench_scratch_decrypt;
        else if (args.op == "keysetup") fn_key = bench_scratch_keysetup;
    } else if (args.impl == "openssl-ecb") {
        if (args.op == "encrypt") fn = bench_openssl_ecb_encrypt;
        else if (args.op == "decrypt") fn = bench_openssl_ecb_decrypt;
        else if (args.op == "keysetup") fn_key = bench_openssl_ecb_keysetup;
    } else if (args.impl == "openssl-gcm") {
        if (args.op == "encrypt") fn = bench_openssl_gcm_encrypt;
        else if (args.op == "decrypt") fn = bench_openssl_gcm_decrypt;
    }
    if (!fn && !fn_key) {
        std::cerr << "error: invalid --impl/--op combination\n";
        return 2;
    }

    // Warmup.
    for (int i = 0; i < args.warmup; ++i) {
        if (fn) fn(data, key, 1);
        else fn_key(key, 1);
    }

    // Timed repetitions.
    std::ofstream csv(args.csv_path, std::ios::app);
    if (!csv) {
        std::cerr << "error: cannot open " << args.csv_path << " for writing\n";
        return 1;
    }
    // Write header if file is new.
    csv.seekp(0, std::ios::end);
    if (csv.tellp() == 0) {
        csv << "implementation,operation,input_size_bytes,repetition,"
               "elapsed_time_ns,throughput_mib_s,build_type\n";
    }

    for (int r = 0; r < args.reps; ++r) {
        auto t0 = std::chrono::steady_clock::now();
        if (fn) fn(data, key, 1);
        else fn_key(key, 1);
        auto t1 = std::chrono::steady_clock::now();
        auto ns = std::chrono::duration_cast<std::chrono::nanoseconds>(t1 - t0).count();
        double seconds = static_cast<double>(ns) / 1e9;
        double mib = static_cast<double>(args.size) / (1024.0 * 1024.0);
        double throughput = (seconds > 0.0) ? mib / seconds : 0.0;

        csv << args.impl << "," << args.op << "," << args.size << ","
            << r << "," << ns << "," << std::fixed << std::setprecision(4)
            << throughput << "," << args.label << "\n";
    }

    std::cout << "Benchmark complete: " << args.impl << " " << args.op
              << " size=" << args.size << " reps=" << args.reps << "\n";
    return 0;
}
