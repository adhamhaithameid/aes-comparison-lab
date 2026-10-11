// aes_gcm_openssl.cpp
//
// Implementation B — AES-128-GCM via OpenSSL EVP, with RAII and tag
// verification before plaintext release.

#include "aes_gcm_openssl.hpp"

#include <openssl/evp.h>
#include <openssl/rand.h>
#include <openssl/err.h>

#include <memory>
#include <array>
#include <string>

namespace aesgcm {
namespace {

// RAII owner for EVP_CIPHER_CTX (OpenSSL 3.x: contexts are heap objects).
struct EvpCtxDeleter {
    void operator()(EVP_CIPHER_CTX* ctx) const {
        if (ctx) {
            EVP_CIPHER_CTX_free(ctx);
        }
    }
};
using EvpCtxPtr = std::unique_ptr<EVP_CIPHER_CTX, EvpCtxDeleter>;

// Sanity-check arguments shared by encrypt/decrypt. Throws OperationError.
void check_args(const std::uint8_t* key, const std::uint8_t* nonce) {
    if (key == nullptr) {
        throw OperationError("key must not be null");
    }
    if (nonce == nullptr) {
        throw OperationError("nonce must not be null");
    }
}

// Translate an OpenSSL failure into a generic exception. We deliberately do
// NOT embed the OpenSSL error string in the exception message: it may contain
// implementation details, and callers must not log key material or plaintext.
[[noreturn]] void throw_openssl_error() {
    // Drain the error queue so failed operations don't leave stale state.
    ERR_clear_error();
    throw OperationError("OpenSSL cryptographic operation failed");
}

} // namespace

void random_bytes(std::uint8_t* out, std::size_t len) {
    if (out == nullptr && len > 0) {
        throw OperationError("output buffer must not be null");
    }
    if (RAND_bytes(out, static_cast<int>(len)) != 1) {
        throw_openssl_error();
    }
}

Encrypted encrypt(const std::uint8_t* key, const std::uint8_t* nonce,
                  const std::uint8_t* plaintext, std::size_t plaintext_len,
                  const std::uint8_t* aad, std::size_t aad_len) {
    check_args(key, nonce);

    EvpCtxPtr ctx(EVP_CIPHER_CTX_new());
    if (!ctx) {
        throw_openssl_error();
    }

    // Initialise AES-128-GCM encryption. EVP_CIPHER_CTX_new returns a
    // zeroed context, but be explicit and safe.
    if (EVP_EncryptInit_ex(ctx.get(), EVP_aes_128_gcm(), nullptr, nullptr, nullptr) != 1) {
        throw_openssl_error();
    }

    // Explicitly set the IV length to the GCM standard 96 bits.
    if (EVP_CIPHER_CTX_ctrl(ctx.get(), EVP_CTRL_GCM_SET_IVLEN,
                            static_cast<int>(NONCE_SIZE), nullptr) != 1) {
        throw_openssl_error();
    }

    // Provide key and IV.
    if (EVP_EncryptInit_ex(ctx.get(), nullptr, nullptr, key, nonce) != 1) {
        throw_openssl_error();
    }

    // Supply AAD (if any). AAD does not affect the ciphertext length.
    int out_len = 0;
    if (aad != nullptr && aad_len > 0) {
        if (EVP_EncryptUpdate(ctx.get(), nullptr, &out_len, aad,
                              static_cast<int>(aad_len)) != 1) {
            throw_openssl_error();
        }
    }

    // Encrypt the plaintext. GCM is a stream mode: ciphertext length equals
    // plaintext length (no padding, no expansion).
    Encrypted result;
    result.ciphertext.resize(plaintext_len);
    std::uint8_t* out = plaintext_len > 0 ? result.ciphertext.data() : nullptr;
    if (EVP_EncryptUpdate(ctx.get(), out, &out_len, plaintext,
                          static_cast<int>(plaintext_len)) != 1) {
        throw_openssl_error();
    }
    int total_len = out_len;

    // Finalise. For GCM this produces no extra bytes, but the call is still
    // required.
    if (EVP_EncryptFinal_ex(ctx.get(), out + total_len, &out_len) != 1) {
        throw_openssl_error();
    }
    total_len += out_len;
    result.ciphertext.resize(static_cast<std::size_t>(total_len));

    // Extract the 128-bit authentication tag.
    result.tag.resize(TAG_SIZE);
    if (EVP_CIPHER_CTX_ctrl(ctx.get(), EVP_CTRL_GCM_GET_TAG,
                            static_cast<int>(TAG_SIZE), result.tag.data()) != 1) {
        throw_openssl_error();
    }
    return result;
}

std::optional<std::vector<std::uint8_t>> decrypt(const std::uint8_t* key,
                                                  const std::uint8_t* nonce,
                                                  const std::uint8_t* ciphertext,
                                                  std::size_t ciphertext_len,
                                                  const std::uint8_t* tag,
                                                  const std::uint8_t* aad,
                                                  std::size_t aad_len) {
    check_args(key, nonce);
    if (tag == nullptr) {
        throw OperationError("tag must not be null");
    }

    EvpCtxPtr ctx(EVP_CIPHER_CTX_new());
    if (!ctx) {
        throw_openssl_error();
    }

    if (EVP_DecryptInit_ex(ctx.get(), EVP_aes_128_gcm(), nullptr, nullptr, nullptr) != 1) {
        throw_openssl_error();
    }
    if (EVP_CIPHER_CTX_ctrl(ctx.get(), EVP_CTRL_GCM_SET_IVLEN,
                            static_cast<int>(NONCE_SIZE), nullptr) != 1) {
        throw_openssl_error();
    }
    if (EVP_DecryptInit_ex(ctx.get(), nullptr, nullptr, key, nonce) != 1) {
        throw_openssl_error();
    }

    // Verify the AAD first.
    int out_len = 0;
    if (aad != nullptr && aad_len > 0) {
        if (EVP_DecryptUpdate(ctx.get(), nullptr, &out_len, aad,
                              static_cast<int>(aad_len)) != 1) {
            throw_openssl_error();
        }
    }

    // Decrypt into a local buffer. This buffer is internal: if the tag check
    // fails below, the buffer is destroyed without ever leaving this
    // function, so unauthenticated plaintext is never released.
    std::vector<std::uint8_t> plaintext(ciphertext_len);
    std::uint8_t* out = ciphertext_len > 0 ? plaintext.data() : nullptr;
    if (EVP_DecryptUpdate(ctx.get(), out, &out_len, ciphertext,
                          static_cast<int>(ciphertext_len)) != 1) {
        throw_openssl_error();
    }
    int total_len = out_len;

    // Install the expected tag BEFORE finalising.
    if (EVP_CIPHER_CTX_ctrl(ctx.get(), EVP_CTRL_GCM_SET_TAG,
                            static_cast<int>(TAG_SIZE),
                            const_cast<std::uint8_t*>(tag)) != 1) {
        throw_openssl_error();
    }

    // EVP_DecryptFinal_ex returns 1 only if the tag verifies. On mismatch it
    // returns <= 0 and OpenSSL may leave the plaintext buffer partially
    // written — we discard it entirely.
    int ok = EVP_DecryptFinal_ex(ctx.get(), out + total_len, &out_len);
    if (ok != 1) {
        ERR_clear_error(); // do not leak queue state
        return std::nullopt;
    }
    total_len += out_len;
    plaintext.resize(static_cast<std::size_t>(total_len));
    return plaintext;
}

EncryptedBlob encrypt_with_random_nonce(const std::uint8_t* key,
                                        const std::uint8_t* plaintext,
                                        std::size_t plaintext_len,
                                        const std::uint8_t* aad,
                                        std::size_t aad_len) {
    std::array<std::uint8_t, NONCE_SIZE> nonce{};
    random_bytes(nonce.data(), nonce.size());
    Encrypted enc = encrypt(key, nonce.data(), plaintext, plaintext_len, aad, aad_len);
    EncryptedBlob blob;
    blob.blob.reserve(NONCE_SIZE + enc.ciphertext.size() + TAG_SIZE);
    blob.blob.insert(blob.blob.end(), nonce.begin(), nonce.end());
    blob.blob.insert(blob.blob.end(), enc.ciphertext.begin(), enc.ciphertext.end());
    blob.blob.insert(blob.blob.end(), enc.tag.begin(), enc.tag.end());
    return blob;
}

std::optional<std::vector<std::uint8_t>> decrypt_blob(const std::uint8_t* key,
                                                       const std::uint8_t* blob,
                                                       std::size_t blob_len,
                                                       const std::uint8_t* aad,
                                                       std::size_t aad_len) {
    if (blob_len < NONCE_SIZE + TAG_SIZE) {
        // Too short to contain a nonce and a tag; reject without touching
        // OpenSSL (avoids undefined behavior on tiny buffers).
        return std::nullopt;
    }
    const std::uint8_t* nonce = blob;
    const std::uint8_t* tag = blob + blob_len - TAG_SIZE;
    std::size_t ciphertext_len = blob_len - NONCE_SIZE - TAG_SIZE;
    const std::uint8_t* ciphertext =
        ciphertext_len > 0 ? blob + NONCE_SIZE : nullptr;
    return decrypt(key, nonce, ciphertext, ciphertext_len, tag, aad, aad_len);
}

} // namespace aesgcm
