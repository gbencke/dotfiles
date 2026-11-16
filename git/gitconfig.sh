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

# Use Delta for Git output and Difftastic for explicit comparisons.
git config --global core.pager delta
git config --global pager.diff delta
# Keep short diffs open and enable n/N navigation.
git config --global delta.paging always
git config --global delta.navigate true
git config --global interactive.diffFilter "delta --color-only --features=interactive"
git config --global diff.tool difftastic
git config --global difftool.difftastic.cmd 'difft "$LOCAL" "$REMOTE"'
git config --global difftool.prompt false
# Remove the external diff override so Git produces patches for Delta.
git config --global --unset-all diff.external || test "$?" -eq 5
