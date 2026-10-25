#!/bin/bash

git config --global user.email "gbencke@benckesoftware.com.br"
git config --global user.name "Guilherme Bencke"

git config core.editor vim

# Workflow defaults (see lazygit/README.md)
git config --global merge.conflictstyle zdiff3
git config --global rerere.enabled true
git config --global fetch.prune true
git config --global push.autoSetupRemote true
git config --global rebase.autoStash true
