---
name: blast-radius
description: Change-only — reverse-dependency impact of the change; who breaks downstream; risk tier.
signals:
  - change-only
---

# blast-radius lens

Change reviews only. Input: the diff AND the orchestrator's mechanical
reverse import/caller graph. Your job: complete the graph with couplings
imports can't see, classify the change kind, and assign a risk tier.
