// Decodes build-time XOR-encoded keys injected by vite.config.js `define`.
// Keys live only in .env (gitignored); their raw strings never appear in
// source, in the repository, or verbatim in the built bundle.
export function decodeKey(encoded) {
  try {
    if (!encoded || !Array.isArray(encoded.data) || !Array.isArray(encoded.pad)) return '';
    return encoded.data
      .map((b, i) => String.fromCharCode(b ^ encoded.pad[i % encoded.pad.length]))
      .join('');
  } catch {
    return '';
  }
}
