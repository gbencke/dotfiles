# security rules — reachable attack paths only

For every finding, name the entry point (endpoint, message, file parse,
CLI arg) and the payload shape that reaches the defect. No theoretical
"hardening" nits.

## Injection

- SQL built by string concatenation/formatting with values that trace to
  request input (params, headers, path segments).
- Command execution (`exec`, `system`, `popen`, `child_process`) with any
  interpolated input; also `shell=True` with formatted strings.
- Template/HTML rendering with unescaped user input (XSS); `dangerouslySetInnerHTML`,
  `innerHTML =`, `| safe` filters on user-controlled data.
- Path traversal: file paths built from user input without normalization +
  allowlist (`../`, absolute paths, symlinks).
- Deserialization of untrusted data with polymorphic/native deserializers
  (pickle, Java serialization, YAML `load` without SafeLoader).

## AuthN / AuthZ

- Endpoints/handlers missing an auth check where siblings have one —
  inconsistency is the tell. Verify against middleware/routes before
  reporting (challenger will).
- Object-level authorization missing: fetch by id from path params with no
  ownership check (IDOR/BOLA).
- Privilege checks done client-side only, or role compared as
  case-sensitive string after unnormalized input.
- JWT: `alg: none` accepted, no expiry check, signature verification
  disabled in code paths reachable outside tests.

## Secrets & sensitive data

- Hardcoded secrets/keys/tokens in code, tests, fixtures, or docs
  (high-entropy strings, known prefixes: `AKIA`, `ghp_`, `sk-`, `-----BEGIN`).
- Secrets logged (request/response dumps, error messages containing
  authorization headers or connection strings).
- PII/payment data in logs; sensitive data in URLs (query strings end up
  in access logs).
- Crypto: MD5/SHA1 for passwords, ECB mode, hardcoded IVs/keys,
  `Math.random`/non-CSPRNG for tokens.

## Supply chain (light touch)

- Dependencies pulled from unpinned URLs/commits; postinstall scripts in
  newly added packages.

Cite as `security#sqli`, `security#idor`, `security#hardcoded-secret`, …
