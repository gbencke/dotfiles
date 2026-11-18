# Stick Scene

Create interactive, hand-drawn stick-figure scenes that show what a product does. Each scene uses a `<stick-scene>` canvas widget that idles and plays an action on click, hover, or scroll into view.

## Source

- Upstream: [nilbuild/stick-scene](https://github.com/nilbuild/stick-scene)
- Imported commit: `ca84311177a020c2dff7dfd9cb2e7b786288c1ab`
- License: MIT; see [LICENSE](LICENSE).

`SKILL.md`, `runtime/`, `templates/`, `scripts/`, `references/`, and `examples/` are copied unchanged from upstream. The demo website, showcase, and promotional media are not included.

## Use

Ask Pi to use the `stick-scene` skill, for example:

> Use stick-scene to show an agent fixing review comments on a landing page.

Read [SKILL.md](SKILL.md) for the workflow. The browser runtime has no package dependencies. It loads Balsamiq Sans from Google Fonts by default; add the `no-font` attribute to prevent that request.

The frame and motion checks need Node.js, Playwright 1.56.1, and a Chromium browser. Install these only when you need the checks, in a scratch directory:

```bash
mkdir -p /tmp/stick-scene-preview
cd /tmp/stick-scene-preview
npm install playwright@1.56.1
npx playwright install chromium
```

Set `NODE_PATH=/tmp/stick-scene-preview/node_modules` when running the check commands in `SKILL.md`.

## Live Pi installation

Link this directory into Pi's live skills folder. Run from the dotfiles repository root:

```bash
ln -s "$PWD/skills/utils/stick-scene" "$HOME/.pi/agent/skills/stick-scene"
```

The link keeps the live skill in sync with this repository. Reload Pi with `/reload` or start a new session after installation.
