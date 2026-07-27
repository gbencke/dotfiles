---
name: docs
description: Code comments and inline documentation accuracy — docs must agree with the code they describe.
signals:
  - always
---

# docs lens

Always applies. Reviews inline docs: docstrings, JSDoc/TSDoc, rustdoc,
godoc, javadoc, header comments, and README sections that describe specific
code behavior. Documentation drift — comments that lie about the code — is
the target.
