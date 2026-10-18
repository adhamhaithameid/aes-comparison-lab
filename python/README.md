# Python AES-128 MixColumns Comparison

A pure-Python AES-128 implementation comparing two MixColumns strategies:

- **Version A** — MixColumns computed with `xtime` operations.
- **Version B** — MixColumns using precomputed multiplication-by-2 / by-3 lookup tables.

Everything else (rounds, S-box, key schedule, block processing) is identical.

Source of truth for this module: `320230016_AES_Comparison.rar` (integrated under
student `adham haitham eid` / ID `320230021`).

## Run

```bash
cd python
python3 aes_compare.py
```

## Files

- `aes_compare.py` — implementation + benchmark harness
- `report.md` — comparison report and environment notes
- `output.txt` — captured run output (source artifact)
- `output.png` — captured figure
