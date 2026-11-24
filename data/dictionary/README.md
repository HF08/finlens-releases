# Offline dictionary data

FinLens builds its offline lookup database from ECDICT:

- Source: https://github.com/skywind3000/ECDICT
- License: MIT
- Optional rebuild source file: `ecdict.csv`
- Runtime database: `ecdict.sqlite`
- Build metadata: `ecdict.metadata.json`

The installed database's exact source hashes are recorded in
`PROVENANCE.md`. The runtime does not read `ecdict.csv`; the CSV is only an
optional rebuild input.

Rebuild after updating the source CSV:

```bash
npm run dictionary:build
```

The web server blocks the entire `/data/dictionary/` directory from static
access. Dictionary queries go through `/api/dictionary` only.
