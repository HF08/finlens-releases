# ECDICT provenance

The installed `ecdict.sqlite` was built from the complete ECDICT CSV bundled in
the MIT-licensed `ecdict@0.0.4` npm package.

- npm shasum: `aadfa6e46ed9c586144a3f749d585111168ec5f2`
- Source CSV bytes: `65,936,699`
- Source CSV SHA-256: `d0ce61e560b50d9905d20de3173aa3ca80950ce235bedd21c53e025cf9f38cb0`
- Imported entries: `770,611`
- SQLite database bytes: `74,063,872`
- ECDICT upstream: https://github.com/skywind3000/ECDICT
- ECDICT license: MIT (`ECDICT-LICENSE.txt`)

The official latest CSV can be used to rebuild the database later with:

```bash
npm run dictionary:build
```
