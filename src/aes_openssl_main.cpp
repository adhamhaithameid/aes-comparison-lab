// aes_openssl_main.cpp
//
// Command-line interface for Implementation B (OpenSSL AES-128-GCM).
//
// Subcommands:
//   keygen <keyfile>              Generate a random 128-bit key (hex, 0600).
//   encrypt <keyfile> <in> <out>  Encrypt a file with a fresh random nonce.
//                                 Output format: nonce(12) || tag(16) || ciphertext.
//   decrypt <keyfile> <in> <out>  Decrypt and verify; rejects tampered data.
//   selftest                      Run a small built-in KAT check.
//
// Security: the authentication tag is verified before any plaintext is
// written; on failure the output file is NOT created.

#include "aes_gcm_openssl.hpp"

#include <openssl/rand.h>

#include <cstring>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <string>
#include <sys/stat.h>
#include <vector>

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

bool read_file(const std::string& path, std::vector<std::uint8_t>& out) {
    std::ifstream in(path, std::ios::binary);
    if (!in) return false;
    in.seekg(0, std::ios::end);
    std::streamoff size = in.tellg();
    in.seekg(0, std::ios::beg);
    out.resize(static_cast<std::size_t>(size));
    in.read(reinterpret_cast<char*>(out.data()), size);
    return static_cast<std::size_t>(in.gcount()) == out.size();
}

bool write_file(const std::string& path, const std::uint8_t* data, std::size_t len) {
    std::ofstream out(path, std::ios::binary);
    if (!out) return false;
    out.write(reinterpret_cast<const char*>(data),
              static_cast<std::streamsize>(len));
    return out.good();
}

int cmd_keygen(const std::string& keyfile) {
    std::uint8_t key[aesgcm::KEY_SIZE];
    try {
        aesgcm::random_bytes(key, sizeof(key));
    } catch (const std::exception& e) {
        std::cerr << "error: key generation failed: " << e.what() << "\n";
        return 1;
    }
    std::ofstream out(keyfile, std::ios::binary);
    if (!out) {
        std::cerr << "error: cannot open " << keyfile << " for writing\n";
        return 1;
    }
    out << to_hex(key, sizeof(key)) << "\n";
    // Restrict permissions to owner read/write.
    ::chmod(keyfile.c_str(), S_IRUSR | S_IWUSR);
    std::cout << "Generated 128-bit key in " << keyfile << "\n";
    return 0;
}

int cmd_encrypt(const std::string& keyfile, const std::string& infile,
                const std::string& outfile) {
    std::string key_hex;
    {
        std::ifstream in(keyfile);
        if (!in || !(in >> key_hex)) {
            std::cerr << "error: cannot read key from " << keyfile << "\n";
            return 1;
        }
    }
    std::uint8_t key[aesgcm::KEY_SIZE];
    if (!from_hex(key_hex, key, aesgcm::KEY_SIZE)) {
        std::cerr << "error: key file must contain exactly 32 hex characters\n";
        return 1;
    }

    std::vector<std::uint8_t> plaintext;
    if (!read_file(infile, plaintext)) {
        std::cerr << "error: cannot read input file " << infile << "\n";
        return 1;
    }

    std::vector<std::uint8_t> nonce(aesgcm::NONCE_SIZE);
    aesgcm::random_bytes(nonce.data(), nonce.size());

    aesgcm::Encrypted enc;
    try {
        enc = aesgcm::encrypt(key, nonce.data(), plaintext.data(), plaintext.size());
    } catch (const std::exception& e) {
        std::cerr << "error: encryption failed: " << e.what() << "\n";
        return 1;
    }

    // Output format: nonce || tag || ciphertext.
    std::vector<std::uint8_t> blob;
    blob.reserve(nonce.size() + enc.tag.size() + enc.ciphertext.size());
    blob.insert(blob.end(), nonce.begin(), nonce.end());
    blob.insert(blob.end(), enc.tag.begin(), enc.tag.end());
    blob.insert(blob.end(), enc.ciphertext.begin(), enc.ciphertext.end());

    if (!write_file(outfile, blob.data(), blob.size())) {
        std::cerr << "error: cannot write output file " << outfile << "\n";
        return 1;
    }
    std::cout << "Encrypted " << plaintext.size() << " bytes -> " << outfile << "\n";
    return 0;
}

int cmd_decrypt(const std::string& keyfile, const std::string& infile,
                const std::string& outfile) {
    std::string key_hex;
    {
        std::ifstream in(keyfile);
        if (!in || !(in >> key_hex)) {
            std::cerr << "error: cannot read key from " << keyfile << "\n";
            return 1;
        }
    }
    std::uint8_t key[aesgcm::KEY_SIZE];
    if (!from_hex(key_hex, key, aesgcm::KEY_SIZE)) {
        std::cerr << "error: key file must contain exactly 32 hex characters\n";
        return 1;
    }

    std::vector<std::uint8_t> blob;
    if (!read_file(infile, blob)) {
        std::cerr << "error: cannot read input file " << infile << "\n";
        return 1;
    }

    if (blob.size() < aesgcm::NONCE_SIZE + aesgcm::TAG_SIZE) {
        std::cerr << "error: input too short to be a valid encrypted file\n";
        return 1;
    }

    const std::uint8_t* nonce = blob.data();
    const std::uint8_t* tag = blob.data() + blob.size() - aesgcm::TAG_SIZE;
    std::size_t ct_len = blob.size() - aesgcm::NONCE_SIZE - aesgcm::TAG_SIZE;
    const std::uint8_t* ciphertext = blob.data() + aesgcm::NONCE_SIZE;

    auto plaintext = aesgcm::decrypt(key, nonce, ciphertext, ct_len, tag);
    if (!plaintext.has_value()) {
        // Authentication failure: do NOT write any output file.
        std::cerr << "error: authentication failed — wrong key or tampered data. "
                  << "No output written.\n";
        return 1;
    }

    if (!write_file(outfile, plaintext->data(), plaintext->size())) {
        std::cerr << "error: cannot write output file " << outfile << "\n";
        return 1;
    }
    std::cout << "Decrypted " << plaintext->size() << " bytes -> " << outfile << "\n";
    return 0;
}

int cmd_selftest() {
    // McGrew-Viega GCM spec Test Case 3 (AES-128):
    //   K = feffe9928665731c6d6a8f9467308308
    //   IV = cafebabefacedbaddecaf888
    //   P = d9313225...ba63791aafd255 (64 bytes)
    //   C = 42831ec2...3d58e091473f5985
    //   T = 4d5c2af327cd64a62cf35abd2ba6fab4
    const char* k_hex = "feffe9928665731c6d6a8f9467308308";
    const char* iv_hex = "cafebabefacedbaddecaf888";
    const char* pt_hex =
        "d9313225f88406e5a55909c5aff5269a"
        "86a7a9531534f7da2e4c303d8a318a7"
        "21c3c0c95956809532fcf0e2449a6b52"
        "5b16aedf5aa0de657ba637b391aafd255";
    const char* ct_hex =
        "42831ec2217774244b7221b784d0d49c"
        "e3aa212f2c02a4e035c17e2329aca12e"
        "21d514b25466931c7d8f6a5aac84aa05"
        "1ba30b396a0aac973d58e091473f5985";
    const char* tag_hex = "4d5c2af327cd64a62cf35abd2ba6fab4";

    std::uint8_t key[16], iv[12], pt[64], ct[64], tag[16];
    if (!from_hex(k_hex, key, 16) || !from_hex(iv_hex, iv, 12) ||
        !from_hex(pt_hex, pt, 64) || !from_hex(ct_hex, ct, 64) ||
        !from_hex(tag_hex, tag, 16)) {
        std::cerr << "error: internal test vector parsing failed\n";
        return 1;
    }

    auto enc = aesgcm::encrypt(key, iv, pt, 64);
    bool ok = to_hex(enc.ciphertext.data(), 64) == to_hex(ct, 64) &&
              to_hex(enc.tag.data(), 16) == to_hex(tag, 16);
    std::cout << "GCM encrypt KAT: " << (ok ? "PASS" : "FAIL") << "\n";

    auto dec = aesgcm::decrypt(key, iv, enc.ciphertext.data(), 64, enc.tag.data());
    bool ok2 = dec.has_value() && to_hex(dec->data(), 64) == to_hex(pt, 64);
    std::cout << "GCM decrypt KAT: " << (ok2 ? "PASS" : "FAIL") << "\n";

    return (ok && ok2) ? 0 : 1;
}

void print_usage() {
    std::cout <<
        "AES-128-GCM via OpenSSL — authenticated file encryption\n"
        "\n"
        "Usage:\n"
        "  aes_openssl keygen <keyfile>\n"
        "  aes_openssl encrypt <keyfile> <infile> <outfile>\n"
        "  aes_openssl decrypt <keyfile> <infile> <outfile>\n"
        "  aes_openssl selftest\n"
        "\n"
        "Encrypted file format: nonce(12 bytes) || tag(16 bytes) || ciphertext.\n"
        "The tag is verified before any plaintext is written; tampered files\n"
        "are rejected and no output is created.\n";
}

} // namespace

int main(int argc, char** argv) {
    if (argc < 2) {
        print_usage();
        return 2;
    }
    std::string cmd = argv[1];
    if (cmd == "keygen" && argc == 3) {
        return cmd_keygen(argv[2]);
    } else if (cmd == "encrypt" && argc == 5) {
        return cmd_encrypt(argv[2], argv[3], argv[4]);
    } else if (cmd == "decrypt" && argc == 5) {
        return cmd_decrypt(argv[2], argv[3], argv[4]);
    } else if (cmd == "selftest" && argc == 2) {
        return cmd_selftest();
    } else {
        print_usage();
        return 2;
    }
}
