#!/usr/bin/env python3
"""Extract a representative subset of test cases from the (very large) NIST CAVP
GCM response files so the subset can be kept in the repository.

The full files are ~2.9 MB each because they cover every combination of
plaintext length and AAD length.  This script keeps a documented, deterministic
selection of sections while preserving the original file format, so the test
harness parses the subset exactly like the original.

The full files are NOT modified; the subset is written to a new file.

Usage:
    python3 extract_gcm_subset.py <full_encrypt.rsp> <full_decrypt.rsp> <outdir>
"""

import sys
import os

# Section selection: (PTlen_bits, AADlen_bits) pairs to keep.
# Chosen to cover: empty plaintext, one block (128 b), non-block-multiple
# lengths (504/512 b), multi-block (1024 b), and AAD lengths of 0, 20 and 48
# bytes (the AAD lengths used in the original GCM specification test cases).
KEEP_PT = {0, 128, 504, 512, 1024}
KEEP_AAD = {0, 160, 384}

# How many Count blocks to keep per section.
ENCRYPT_COUNTS = 2   # counts 0..1
DECRYPT_COUNTS = 4   # counts 0..3 (first counts include FAIL cases)


def parse_sections(text):
    """Yield (header_lines, [case_texts]) for each section of the file."""
    lines = text.splitlines()
    sections = []
    current_header = []
    current_cases = []
    current_case = None

    def flush_case():
        nonlocal current_case
        if current_case:
            current_cases.append(current_case)
            current_case = None

    def flush_section():
        nonlocal current_header, current_cases
        flush_case()
        if current_header:
            sections.append((current_header, current_cases))
        current_header, current_cases = [], []

    for line in lines:
        if line.startswith("["):
            # A bracket line. PTlen/AADlen lines end a previous section when
            # they change; the simplest robust approach: every PTlen line
            # starts a new section (Keylen/IVlen precede it).
            if line.startswith("[PTlen"):
                flush_section()
            current_header.append(line)
        elif line.startswith("Count ="):
            flush_case()
            current_case = [line]
        elif current_case is not None:
            current_case.append(line)
        elif line.strip():
            # Preamble/comment before the first Count block.
            current_header.append(line)
    flush_section()
    return sections


def section_meta(header):
    meta = {}
    for line in header:
        if line.startswith("[") and "=" in line:
            key, _, val = line[1:-1].partition("=")
            try:
                meta[key.strip()] = int(val.strip())
            except ValueError:
                pass
    return meta


def extract(path, keep_pt, keep_aad, max_counts, out_path, purpose):
    with open(path, "r") as f:
        text = f.read()
    sections = parse_sections(text)
    kept_sections = 0
    kept_cases = 0
    out = []
    out.append("# Subset of the NIST CAVP 14.0 GCM %s (keysize 128) file." % purpose)
    out.append("# Extracted by scripts/extract_gcm_subset.py - see")
    out.append("# tests/test_vectors/PROVENANCE.md for the source of the full file.")
    out.append("# Kept sections: PTlen in %s bits, AADlen in %s bits, first %d Count blocks each."
               % (sorted(keep_pt), sorted(keep_aad), max_counts))
    for header, cases in sections:
        meta = section_meta(header)
        if meta.get("PTlen") not in keep_pt or meta.get("AADlen") not in keep_aad:
            continue
        if meta.get("Keylen") != 128 or meta.get("IVlen") != 96 or meta.get("Taglen") != 128:
            continue
        kept_sections += 1
        kept_cases += min(len(cases), max_counts)
        out.append("")
        out.extend(header)
        for case in cases[:max_counts]:
            out.append("")
            out.extend(case)
    with open(out_path, "w") as f:
        f.write("\n".join(out).rstrip() + "\n")
    print("%s: kept %d sections / %d cases -> %s"
          % (purpose, kept_sections, kept_cases, out_path))


def main():
    if len(sys.argv) != 4:
        print(__doc__)
        sys.exit(2)
    enc, dec, outdir = sys.argv[1], sys.argv[2], sys.argv[3]
    os.makedirs(outdir, exist_ok=True)
    extract(enc, KEEP_PT, KEEP_AAD, ENCRYPT_COUNTS,
            os.path.join(outdir, "gcmEncryptExtIV128_subset.rsp"), "Encrypt file")
    extract(dec, KEEP_PT, KEEP_AAD, DECRYPT_COUNTS,
            os.path.join(outdir, "gcmDecrypt128_subset.rsp"), "Decrypt file")


if __name__ == "__main__":
    main()
