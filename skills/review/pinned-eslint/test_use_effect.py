import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


RULE = "pinned/no-use-effect"
SKILL_DIR = Path(__file__).resolve().parent
EXTENSIONS = ("ts", "tsx", "mts", "cts", "js", "jsx", "mjs")
BANNED = {
    "named": "import { useEffect } from 'react';",
    "aliased": "import { useEffect as effect } from 'react';",
    "default": "import React from 'react'; React.useEffect;",
    "namespace": "import * as Hooks from 'react'; Hooks.useEffect;",
    "nested": (
        "import React from 'react';\n"
        "export function useProbe() { React.useEffect(() => {}, []); }"
    ),
    "computed": "import React from 'react'; React['useEffect'];",
    "optional": "import React from 'react'; React?.useEffect;",
    "destructured": "import React from 'react'; const { useEffect } = React;",
    "destructured-alias": (
        "import * as Hooks from 'react'; const { useEffect: effect } = Hooks;"
    ),
    "destructured-computed": (
        "import React from 'react'; const { ['useEffect']: effect } = React;"
    ),
    "reference": "import React from 'react'; const effect = React.useEffect;",
    "reexport": "export { useEffect } from 'react';",
    "reexport-alias": "export { useEffect as effect } from 'react';",
    "reexport-all": "export * from 'react';",
    "reexport-namespace": "export * as Hooks from 'react';",
}
ALLOWED = {
    "other-hook": "import { useState } from 'react';",
    "other-member": "import React from 'react'; React.useState;",
    "other-namespace": "import * as Hooks from 'react'; Hooks.useState;",
    "other-destructured": "import React from 'react'; const { useState } = React;",
    "rest": "import React from 'react'; const { useState, ...rest } = React;",
    "other-module": "import { useEffect } from './other.js';",
    "other-object": "const React = { useEffect() {} }; React.useEffect();",
    "shadowed": (
        "import React from 'react';\n"
        "function read(React) { return React.useEffect; }"
    ),
    "other-computed": (
        "import React from 'react'; const useEffect = 'useState';"
        " React[useEffect];"
    ),
    "text": "const message = 'useEffect';",
    "other-reexport": "export { useEffect } from './other.js';",
}
COMMONJS_BANNED = {
    "member": "const React = require('react'); React.useEffect;",
    "computed": "const React = require('react'); React['useEffect'];",
    "destructured": "const { useEffect } = require('react');",
    "destructured-alias": "const { useEffect: effect } = require('react');",
    "direct": "require('react').useEffect;",
}
COMMONJS_ALLOWED = {
    "other-hook": "const { useState } = require('react');",
    "other-object": "const React = require('./other'); React.useEffect;",
    "shadowed": (
        "const React = require('react');\n"
        "function read(React) { return React.useEffect; }"
    ),
    "shadowed-require": (
        "function read(require) { return require('react').useEffect; }"
    ),
}


class UseEffectBanTest(unittest.TestCase):
    def test_default_config_bans_use_effect(self):
        temporary_root = "/private/tmp" if sys.platform == "darwin" else None
        with tempfile.TemporaryDirectory(dir=temporary_root) as directory:
            root = Path(directory).resolve()
            (root / "tsconfig.json").write_text(json.dumps({
                "compilerOptions": {
                    "target": "ES2023",
                    "module": "ESNext",
                    "moduleResolution": "Bundler",
                    "allowJs": True,
                    "strict": True,
                    "skipLibCheck": True,
                },
                "include": ["*"],
            }))
            (root / "package.json").write_text('{"type":"module"}')
            expected = {}
            for extension in EXTENSIONS:
                for kind, cases in (("banned", BANNED), ("allowed", ALLOWED)):
                    for name, snippet in cases.items():
                        filename = f"{kind}-{name}-{extension}.{extension}"
                        (root / filename).write_text(snippet + "\n")
                        expected[filename] = int(kind == "banned")
            for extension in ("cjs", "cts"):
                for kind, cases in (("banned", COMMONJS_BANNED),
                                    ("allowed", COMMONJS_ALLOWED)):
                    for name, snippet in cases.items():
                        filename = f"{kind}-require-{name}.{extension}"
                        (root / filename).write_text(snippet + "\n")
                        expected[filename] = int(kind == "banned")
            report = root / "report.json"
            if os.name == "nt":
                command = [
                    "powershell.exe", "-NoProfile", "-File",
                    str(SKILL_DIR / "pinned-eslint.ps1"),
                ]
            else:
                command = [str(SKILL_DIR / "pinned-eslint")]
            result = subprocess.run(
                command + [str(root), "--report", str(report),
                           "--", "--format", "json", "."],
                capture_output=True, text=True, timeout=120, check=False,
            )
            self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
            self.assertTrue(report.exists(), result.stdout + result.stderr)
            diagnostics = {
                Path(entry["filePath"]).name: entry
                for entry in json.loads(report.read_text())
            }
            self.assertEqual(set(diagnostics), set(expected))
            for filename, count in expected.items():
                with self.subTest(file=filename):
                    entry = diagnostics[filename]
                    self.assertEqual(entry["fatalErrorCount"], 0, entry)
                    violations = [message for message in entry["messages"]
                                  if message["ruleId"] == RULE]
                    self.assertEqual(len(violations), count, entry)
                    for violation in violations:
                        self.assertEqual(violation["severity"], 2)

    def test_explicit_bundled_and_custom_configs(self):
        temporary_root = "/private/tmp" if sys.platform == "darwin" else None
        with tempfile.TemporaryDirectory(dir=temporary_root) as directory:
            root = Path(directory).resolve()
            (root / "probe.js").write_text(
                "import React from 'react'; React.useEffect;\n"
            )
            custom = root / "custom.config.mjs"
            custom.write_text("export default [{ files: ['**/*.js'] }];\n")
            if os.name == "nt":
                command = [
                    "powershell.exe", "-NoProfile", "-File",
                    str(SKILL_DIR / "pinned-eslint.ps1"),
                ]
            else:
                command = [str(SKILL_DIR / "pinned-eslint")]
            for config, count in ((SKILL_DIR / "eslint.config.ts", 1),
                                  (custom, 0)):
                with self.subTest(config=config.name):
                    report = root / "report.json"
                    result = subprocess.run(
                        command + [str(root), "--config", str(config),
                                   "--report", str(report), "--", "--format",
                                   "json", "probe.js"],
                        capture_output=True, text=True, timeout=120,
                        check=False,
                    )
                    self.assertEqual(
                        result.returncode, count, result.stdout + result.stderr
                    )
                    entries = json.loads(report.read_text())
                    violations = [message for entry in entries
                                  for message in entry["messages"]
                                  if message["ruleId"] == RULE]
                    self.assertEqual(len(violations), count, entries)


if __name__ == "__main__":
    unittest.main()
