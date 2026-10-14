# Security Policy

Better Scholar runs entirely within the user's browser, analyzing Google Scholar profiles locally with zero telemetry, zero analytics, and zero external network transmission (with the optional exception of user-initiated Semantic Scholar lookups).

A security vulnerability includes any defect that leaks user browsing history, exposes local cache/settings to unauthorized origins, allows Cross-Site Scripting (XSS) through paper metadata or venue titles, or bypasses origin fencing on DOM CustomEvents.

---

## Reporting a Vulnerability

Please report security issues privately rather than through public issues or forum discussions.

1. Open a private security advisory on GitHub:  
   **[github.com/boyugou/better-scholar/security/advisories/new](https://github.com/boyugou/better-scholar/security/advisories/new)**  
   (via the **Report a vulnerability** button under the repository's **Security** tab).
2. Include:
   - Extension version and browser version (e.g., Chrome 124, Chromium 125).
   - Step-by-step reproduction instructions or a minimal test profile snippet.
   - Analysis of potential impact or privilege escalation.
3. Allow adequate time for remediation before disclosing details publicly.

---

## Supported Versions

Security fixes and maintenance patches are applied to the latest release on the `main` branch. Older builds or deprecated manifest versions are not maintained.
