# Code Review Checklist: Python `requests` Module
### Structured via the Zinsser Method

> *"My four articles of faith: clarity, simplicity, brevity and humanity."*
> — William Zinsser, *On Writing Well*

Zinsser taught that good nonfiction writing follows four phases: **Principles** (the why), **Methods** (the how), **Forms** (the shape), and **Attitudes** (the judgment). Code, like prose, is read far more than it is written. This checklist applies that same architecture to reviewing HTTP client code built on Python's `requests` library (v2.32.5, August 2025).

---

## Part I — Principles

*Zinsser's principles are about stripping sentences to their cleanest components. In code review, principles are about stripping HTTP interactions to their safest, most correct components.*

### 1. The Transaction (Does the request say what it means?)

- [ ] Every call uses the correct HTTP verb for its semantics. `GET` reads, `POST` creates, `PUT` replaces, `PATCH` modifies, `DELETE` removes. A verb mismatch is like using passive voice — it obscures intent.
- [ ] URLs are constructed from base components, never from string concatenation with user input. Interpolation is the clutter of network code.
- [ ] Query parameters live in `params={}`, not hand-glued into the URL string. Let the library do what it was designed to do.

### 2. Simplicity (Is the request free from unnecessary complexity?)

- [ ] No `verify=False` in production. This was the root cause of CVE-2024-35195, where a single `verify=False` call poisoned an entire Session's connection pool. The fix exists in v2.32.0+. There is no legitimate shortcut here.
- [ ] Credentials never appear in source code. API keys, tokens, passwords — all come from environment variables, secret managers, or config files excluded from version control.
- [ ] If `.netrc` is used, the library version is ≥ 2.32.4 to avoid CVE-2024-47081 (credential leakage via malformed URLs). Alternatively, `trust_env=False` disables `.netrc` entirely.

### 3. Clutter (What can be removed without losing meaning?)

- [ ] No redundant headers. Don't manually set `Content-Type: application/json` when using `json={}` — `requests` already does this. Redundancy in code, like redundancy in prose, makes the reader distrust the author.
- [ ] No bare `except:` or `except Exception:` swallowing connection failures silently. Every suppressed error is an unfinished sentence.
- [ ] No unused response data being fetched. If you only need headers, don't download the body. If you only need status, don't parse JSON.

### 4. Style (Does the code express the author's intent clearly?)

- [ ] Response handling reads top-down: check status, parse body, extract data. The reader should never have to jump backwards to understand the flow.
- [ ] Authentication uses the `auth=` parameter or a custom `AuthBase` subclass — not manually injected headers scattered across calls.
- [ ] Constants (base URLs, timeout values, retry counts) are named, not magic numbers buried in function calls.

---

## Part II — Methods

*Zinsser's methods are about unity, strong leads, and clean mechanics. In code review, methods are about the structural integrity of how requests are composed and managed.*

### 5. Unity (Is the approach consistent throughout?)

- [ ] If more than one request is made, a `requests.Session` is used. Sessions maintain connection pooling, persist headers and cookies, and prevent the subtle per-request bugs that scattered `requests.get()` calls invite.
- [ ] Timeout is specified on every request — either per-call or via a session-level `HTTPAdapter`. A request without a timeout is a sentence without a period: it might never end.
  ```python
  # Connect timeout + Read timeout, always explicit
  response = session.get(url, timeout=(3.05, 27))
  ```
- [ ] Retry logic uses `urllib3.util.retry.Retry` mounted on an `HTTPAdapter`, not hand-written loops. The modern approach is declarative, not imperative:
  ```python
  from requests.adapters import HTTPAdapter
  from urllib3.util.retry import Retry

  retry = Retry(total=3, backoff_factor=0.5,
                status_forcelist=[502, 503, 504])
  session.mount("https://", HTTPAdapter(max_retries=retry))
  ```

### 6. The Lead (Does the request set itself up for success?)

- [ ] `response.raise_for_status()` is called before accessing body content. Checking status after parsing is like burying the lead — the most important fact should come first.
- [ ] Error handling distinguishes between network failures (`ConnectionError`, `Timeout`) and HTTP errors (`HTTPError`). These are different kinds of failure with different recovery paths.
- [ ] Streaming responses (`stream=True`) are used for large payloads, with content consumed inside a `with` block or explicitly closed. Unclosed streams are resource leaks — the prose equivalent of a run-on paragraph that never concludes.

### 7. Bits & Pieces (The mechanical details that matter)

- [ ] `response.json()` is wrapped in a try/except for `JSONDecodeError`. A 200 response with non-JSON body is common — APIs change, proxies inject, errors disguise themselves as success.
- [ ] SSL certificate pinning or custom CA bundles are configured where required, using the `verify='/path/to/ca-bundle'` parameter, not by disabling verification.
- [ ] Proxy configuration, if needed, uses the `proxies={}` parameter. Be aware that `requests` prior to v2.31.0 leaked `Proxy-Authorization` headers on HTTPS redirects (CVE-2023-32681).
- [ ] File uploads use the `files={}` parameter with proper MIME types, not manual multipart encoding.

---

## Part III — Forms

*Zinsser dedicated chapters to specific forms of writing: travel, memoir, science, business. Different contexts demand different attention. Here, the "forms" are the common patterns in which `requests` is used.*

### 8. API Client Code

- [ ] Base URL is defined once. Endpoint paths are composed from it. Repetition in URLs is like verbal tics in writing — it signals carelessness.
- [ ] Pagination is handled completely, not partially. If an API returns pages, the code either walks all pages or explicitly limits with a reason.
- [ ] Rate limiting is respected via `Retry-After` headers or exponential backoff. Ignoring rate limits is the equivalent of shouting louder when someone asks you to be quiet.
- [ ] Response schemas are validated (Pydantic, dataclasses, or at minimum key-existence checks). Trusting unknown JSON structure is trusting a stranger's grammar.

### 9. Web Scraping / Data Fetching

- [ ] `User-Agent` is set to something identifiable and honest. The default (`python-requests/2.32.5`) may be blocked, but spoofing a browser agent is a different kind of dishonesty.
- [ ] `robots.txt` is respected where applicable.
- [ ] Response encoding is handled explicitly. `response.encoding` should be checked or set before accessing `response.text`, because auto-detection is not always reliable.

### 10. Microservice / Internal Communication

- [ ] Service discovery URLs are configurable, not hardcoded. Environments change; code that assumes localhost is code that only works on the author's machine.
- [ ] Circuit breaker or bulkhead patterns are in place for downstream calls. A cascade failure is the distributed systems equivalent of a run-on sentence that brings down the whole paragraph.
- [ ] Correlation/trace IDs are propagated in headers for observability.

---

## Part IV — Attitudes

*Zinsser's final section is about the writer's mindset: confidence, standards, and voice. In code review, attitudes are about the reviewer's judgment calls — the things that are right to question even when they technically work.*

### 11. Should This Be `requests` At All?

- [ ] If the code needs async concurrency, consider `httpx` (sync + async, HTTP/2) or `aiohttp` (pure async). `requests` is synchronous only. Using it in an async codebase and wrapping it in `run_in_executor` is a workaround, not a solution.
- [ ] If the code needs HTTP/2, multiplexing, or streaming bidirectional communication, `requests` is not the right tool. It supports HTTP/1.1 only.
- [ ] For simple internal health checks or one-off scripts, `requests` remains the clearest, most readable choice. Don't reach for complexity when simplicity will serve.

### 12. Version and Supply Chain Hygiene

- [ ] `requests` is pinned to ≥ 2.32.5 (latest as of August 2025). All three recent CVEs (CVE-2023-32681, CVE-2024-35195, CVE-2024-47081) are resolved in this version.
- [ ] Transitive dependencies (`urllib3`, `certifi`, `charset-normalizer`, `idna`) are also reasonably current. `certifi` in particular must stay updated — it carries the CA root certificates.
- [ ] Dependencies are installed in a virtual environment, not system-wide.

### 13. The Reviewer's Posture

- [ ] Read the code as a reader, not a compiler. If the intent isn't clear on first reading, the code needs rewriting — regardless of whether it "works."
- [ ] Ask "what happens when this fails?" for every external call. Networks are unreliable. Servers go down. DNS lies. The happy path is only one path.
- [ ] Trust but verify. If the author says "this endpoint always returns JSON," check the error handling for when it doesn't.

---

## Quick Reference: The Zinsser Diagnostic

For any `requests` call under review, run it through these four questions — one for each of Zinsser's articles of faith:

| Article of Faith | Diagnostic Question |
|---|---|
| **Clarity** | Can I understand what this request does, to whom, and why, without reading any other file? |
| **Simplicity** | Is there anything here that could be removed and the request would still work correctly? |
| **Brevity** | Is the error handling proportional to the risk? (Not too little, not too much.) |
| **Humanity** | If this request fails at 3 AM, will the logs tell a human what went wrong? |

---

*"Rewriting is the essence of writing well."* — So is re-reviewing. Run the checklist twice.
