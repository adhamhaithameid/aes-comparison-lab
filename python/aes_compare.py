# Author: adham haitham eid (Student ID: 320230021)
import time
import statistics
import platform
import sys

# AES-128: standard FIPS 197 S-box and key schedule.
SBOX = bytes.fromhex(
    "637c777bf26b6fc53001672bfed7ab76"
    "ca82c97dfa5947f0add4a2af9ca472c0"
    "b7fd9326363ff7cc34a5e5f171d83115"
    "04c723c31896059a071280e2eb27b275"
    "09832c1a1b6e5aa0523bd6b329e32f84"
    "53d100ed20fcb15b6acbbe394a4c58cf"
    "d0efaafb434d338545f9027f503c9fa8"
    "51a3408f929d38f5bcb6da2110fff3d2"
    "cd0c13ec5f974417c4a77e3d645d1973"
    "60814fdc222a908846eeb814de5e0bdb"
    "e0323a0a4906245cc2d3ac629195e479"
    "e7c8376d8dd54ea96c56f4ea657aae08"
    "ba78252e1ca6b4c6e8dd741f4bbd8b8a"
    "703eb5664803f60e613557b986c11d9e"
    "e1f8981169d98e949b1e87e9ce5528df"
    "8ca1890dbfe6426841992d0fb054bb16"
)
RCON = [0x00,0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36]

def xtime(x):
    return ((x << 1) ^ 0x1b) & 0xff if x & 0x80 else (x << 1) & 0xff

# Version B uses precomputed tables for multiplication by 2 and 3 in GF(2^8).
MUL2 = bytes(xtime(i) for i in range(256))
MUL3 = bytes(MUL2[i] ^ i for i in range(256))

def expand_key(key):
    words = [list(key[i:i+4]) for i in range(0, 16, 4)]
    for i in range(4, 44):
        temp = words[i-1][:]
        if i % 4 == 0:
            temp = temp[1:] + temp[:1]
            temp = [SBOX[x] for x in temp]
            temp[0] ^= RCON[i//4]
        words.append([words[i-4][j] ^ temp[j] for j in range(4)])
    return [sum(words[4*r:4*r+4], []) for r in range(11)]

def add_round_key(s, key):
    return [a ^ b for a, b in zip(s, key)]

def sub_bytes(s):
    return [SBOX[x] for x in s]

def shift_rows(s):
    # State is column-major: index = 4 * column + row.
    out = s[:]
    for row in range(1, 4):
        vals = [s[4*c + row] for c in range(4)]
        vals = vals[row:] + vals[:row]
        for c in range(4):
            out[4*c + row] = vals[c]
    return out

def mix_columns_xtime(s):
    out = s[:]
    for c in range(4):
        i = 4*c
        a0,a1,a2,a3 = s[i:i+4]
        total = a0 ^ a1 ^ a2 ^ a3
        out[i]   = a0 ^ total ^ xtime(a0 ^ a1)
        out[i+1] = a1 ^ total ^ xtime(a1 ^ a2)
        out[i+2] = a2 ^ total ^ xtime(a2 ^ a3)
        out[i+3] = a3 ^ total ^ xtime(a3 ^ a0)
    return out

def mix_columns_tables(s):
    out = s[:]
    for c in range(4):
        i = 4*c
        a0,a1,a2,a3 = s[i:i+4]
        out[i]   = MUL2[a0] ^ MUL3[a1] ^ a2 ^ a3
        out[i+1] = a0 ^ MUL2[a1] ^ MUL3[a2] ^ a3
        out[i+2] = a0 ^ a1 ^ MUL2[a2] ^ MUL3[a3]
        out[i+3] = MUL3[a0] ^ a1 ^ a2 ^ MUL2[a3]
    return out

def encrypt_block(block, round_keys, mix_columns):
    s = add_round_key(list(block), round_keys[0])
    for rnd in range(1, 10):
        s = sub_bytes(s)
        s = shift_rows(s)
        s = mix_columns(s)
        s = add_round_key(s, round_keys[rnd])
    s = sub_bytes(s)
    s = shift_rows(s)
    s = add_round_key(s, round_keys[10])
    return bytes(s)

def encrypt(data, key, mix_columns):
    # Same block-processing method for both versions: independent 16-byte blocks.
    keys = expand_key(key)
    return b"".join(encrypt_block(data[i:i+16], keys, mix_columns)
                    for i in range(0, len(data), 16))

def median_time_ms(data, key, mix_columns):
    samples = []
    for _ in range(7):
        start = time.perf_counter_ns()
        for _ in range(10):
            encrypt(data, key, mix_columns)
        elapsed = time.perf_counter_ns() - start
        samples.append(elapsed / 10 / 1_000_000)
    return statistics.median(samples)

def main():
    key = bytes.fromhex("000102030405060708090a0b0c0d0e0f")
    # Repeatable input bytes, generated outside the timer.
    sizes = [16, 1024, 4096]
    inputs = {n: bytes((i * 29 + 7) & 0xff for i in range(n)) for n in sizes}

    # Correctness check before any timing. Also check the standard AES-128 test vector.
    test_key = bytes.fromhex("000102030405060708090a0b0c0d0e0f")
    test_plain = bytes.fromhex("00112233445566778899aabbccddeeff")
    expected = bytes.fromhex("69c4e0d86a7b0430d8cdb78070b4c55a")
    assert encrypt(test_plain, test_key, mix_columns_xtime) == expected
    assert encrypt(test_plain, test_key, mix_columns_tables) == expected

    print("AES-128 comparison: MixColumns xtime vs lookup tables")
    print("Correctness: both versions match FIPS 197 AES-128 test vector.")
    print("Timing: 7 samples; each sample averages 10 encryptions; median reported.")
    print(f"Python {platform.python_version()} | {platform.platform()}")
    print()
    print(f"{'Input size':<14}{'Version A (ms)':>18}{'Version B (ms)':>18}")
    print("-" * 50)
    results = []
    for n in sizes:
        a = encrypt(inputs[n], key, mix_columns_xtime)
        b = encrypt(inputs[n], key, mix_columns_tables)
        assert a == b, f"Ciphertext mismatch at {n} bytes"
        ta = median_time_ms(inputs[n], key, mix_columns_xtime)
        tb = median_time_ms(inputs[n], key, mix_columns_tables)
        results.append((n, ta, tb))
        print(f"{n:>5} bytes{ta:>18.4f}{tb:>18.4f}")
    print()
    print("All ciphertexts identical before timing.")
    for n, a, b in results:
        faster = "A (xtime)" if a < b else "B (tables)" if b < a else "tie"
        print(f"{n} bytes: faster = {faster}")

if __name__ == "__main__":
    main()
