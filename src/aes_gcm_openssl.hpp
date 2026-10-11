// aes_gcm_openssl.hpp
//
// Implementation B — authenticated encryption with AES-128-GCM using the
// OpenSSL EVP interface (https://docs.openssl.org/).
//
// Security properties provided by this wrapper:
//   * Confidentiality and integrity via AES-128-GCM (NIST SP 800-38D).
//   * A fresh random 96-bit nonce for every encryption (RAND_bytes).
//   * 128-bit authentication tag, verified BEFORE any plaintext is released.
//   * RAII management of OpenSSL EVP contexts (no manual free, exception-safe).
//   * Generic error messages that never leak key material or plaintext.
//
// This is the implementation recommended for real file encryption in this
// project.

#pragma once

#include <cstddef>
#include <cstdint>
#include <optional>
#include <stdexcept>
#include <vector>

namespace aesgcm {

constexpr std::size_t KEY_SIZE = 16;   // AES-128 key
constexpr std::size_t NONCE_SIZE = 12; // 96-bit IV, the GCM standard size
constexpr std::size_t TAG_SIZE = 16;   // 128-bit authentication tag

// Result of an authenticated encryption: ciphertext (same length as the
// plaintext) plus the 16-byte tag.
struct Encrypted {
    std::vector<std::uint8_t> ciphertext;
    std::vector<std::uint8_t> tag;
};

// Thrown when an operation fails for a reason that is safe to report
// (bad arguments, OpenSSL internal error). NEVER thrown for an
// authentication failure — that case is signaled by returning
// std::nullopt from decrypt() so callers cannot confuse the two.
struct OperationError : std::runtime_error {
    explicit OperationError(const std::string& msg) : std::runtime_error(msg) {}
};

// Generate cryptographically secure random bytes into out[0..len).
// Throws OperationError on failure.
void random_bytes(std::uint8_t* out, std::size_t len);

// Authenticated encryption.
//   key        16-byte AES-128 key
//   nonce      12-byte nonce (normally from random_bytes; the caller is
//              responsible for never reusing a nonce with the same key)
//   plaintext  arbitrary length, including empty
//   aad        optional additional authenticated data (may be null/empty)
// Returns ciphertext + 16-byte tag. Throws OperationError on OpenSSL failure.
Encrypted encrypt(const std::uint8_t* key, const std::uint8_t* nonce,
                  const std::uint8_t* plaintext, std::size_t plaintext_len,
                  const std::uint8_t* aad = nullptr, std::size_t aad_len = 0);

// Authenticated decryption. The 128-bit tag is verified BEFORE the plaintext
// is returned; if verification fails (wrong key, modified ciphertext, tag,
// nonce, or AAD) the function returns std::nullopt and NO plaintext is
// released to the caller.
std::optional<std::vector<std::uint8_t>> decrypt(const std::uint8_t* key,
                                                  const std::uint8_t* nonce,
                                                  const std::uint8_t* ciphertext,
                                                  std::size_t ciphertext_len,
                                                  const std::uint8_t* tag,
                                                  const std::uint8_t* aad = nullptr,
                                                  std::size_t aad_len = 0);

// Convenience: encrypt with a freshly generated random nonce, returning
// nonce || ciphertext || tag. The nonce is prepended so a self-contained
// blob can be decrypted later with decrypt_blob().
struct EncryptedBlob {
    std::vector<std::uint8_t> blob; // nonce (12) || ciphertext (n) || tag (16)
};
EncryptedBlob encrypt_with_random_nonce(const std::uint8_t* key,
                                        const std::uint8_t* plaintext,
                                        std::size_t plaintext_len,
                                        const std::uint8_t* aad = nullptr,
                                        std::size_t aad_len = 0);

// Decrypt a blob produced by encrypt_with_random_nonce. Returns std::nullopt
// on any authentication failure, releasing no plaintext.
std::optional<std::vector<std::uint8_t>> decrypt_blob(const std::uint8_t* key,
                                                       const std::uint8_t* blob,
                                                       std::size_t blob_len,
                                                       const std::uint8_t* aad = nullptr,
                                                       std::size_t aad_len = 0);

} // namespace aesgcm
