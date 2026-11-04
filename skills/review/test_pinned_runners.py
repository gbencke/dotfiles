"""Check runner dispatch without installing tools or starting a VM.

Run: python3 -m unittest discover -s skills/review -p 'test_pinned_*.py'
"""

import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parent


class RunnerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="pinned runners ")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.repo = self.root / "repo with spaces"
        self.repo.mkdir()
        self.capture = self.root / "command.json"
        self.bin = self.root / "bin"
        self.bin.mkdir()
        recorder = (
            f"#!{sys.executable}\n"
            "import json, os, pathlib, sys\n"
            "pathlib.Path(os.environ['CAPTURE']).write_text(json.dumps(sys.argv))\n"
            "sys.exit(int(os.environ.get('FAKE_EXIT', '0')))\n"
        )
        for name in ("limactl", "bwrap"):
            self.executable(name, recorder)
        self.executable("npm", "#!/bin/sh\nexit 99\n")
        self.executable("sha256sum", "#!/bin/sh\ncat >/dev/null\necho 'test  -'\n")
        self.env = {
            **os.environ,
            "PATH": f"{self.bin}:{os.environ['PATH']}",
            "CAPTURE": str(self.capture),
            "XDG_CACHE_HOME": str(self.root / "cache"),
        }
        for name in ("pinned-eslint", "pinned-debt"):
            store = self.root / "cache" / name / "test"
            store.mkdir(parents=True)
            (store / ".complete").touch()

    def executable(self, name, text):
        path = self.bin / name
        path.write_text(text)
        path.chmod(0o755)

    def run_skill(self, name, *args, platform="darwin-test"):
        return subprocess.run(
            ["zsh", "-c", 'OSTYPE=$1; shift; source "$@"', "zsh",
             platform, str(ROOT / name / name), *map(str, args)],
            env=self.env, cwd=self.root, capture_output=True, text=True,
            timeout=15,
        )

    def command(self):
        return json.loads(self.capture.read_text())

    def test_eslint_forwards_paths_options_and_overrides(self):
        config = self.root / "custom config.ts"
        config.touch()
        report = self.root / "report with spaces.txt"
        self.env["PINNED_ESLINT_PLUGINS"] = "plugin@1 other@2"
        self.env["ESLINT_USE_FLAT_CONFIG"] = "true"
        result = self.run_skill(
            "pinned-eslint", self.repo, "9.24.0", "--config", config,
            "--report", report, "--", "--format", "json", "src/a b.ts",
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.command()[1:], [
            "shell", "--start", "--workdir", "/", "pinned-skills", "env",
            "PINNED_ESLINT_PLUGINS=plugin@1 other@2",
            "ESLINT_USE_FLAT_CONFIG=true", "zsh",
            str(ROOT / "pinned-eslint/pinned-eslint"),
            str(self.repo), "9.24.0", "--config", str(config),
            "--report", str(report), "--", "--format", "json", "src/a b.ts",
        ])

    def test_eslint_keeps_default_config_mode(self):
        result = self.run_skill("pinned-eslint", self.repo)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.command()[-3:], [str(self.repo), "9.24.0", "--"])

    def test_vm_exit_status_is_preserved(self):
        self.env["FAKE_EXIT"] = "23"
        result = self.run_skill("pinned-eslint", self.repo)
        self.assertEqual(result.returncode, 23, result.stderr)

    def test_missing_repo_fails_before_dispatch(self):
        result = self.run_skill("pinned-eslint", self.root / "missing")
        self.assertEqual(result.returncode, 66, result.stderr)
        self.assertFalse(self.capture.exists())

    def test_eslint_print_store_stays_native(self):
        result = self.run_skill("pinned-eslint", self.repo, "--print-store")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.strip(), str(self.root / "cache/pinned-eslint/test"))
        self.assertFalse(self.capture.exists())

    def test_debt_forwards_multiple_repos_and_options(self):
        second = self.root / "another repo"
        second.mkdir()
        self.env["PINNED_DEBT_PLUGINS"] = "eslint@9.24.0"
        self.env["PINNED_DEBT_PY"] = "complexipy==8.3.0"
        result = self.run_skill(
            "pinned-debt", self.repo, second, "--out", "output folder",
            "--since", "6 months ago",
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.command()[1:], [
            "shell", "--start", "--workdir", "/", "pinned-skills", "env",
            "PINNED_DEBT_PLUGINS=eslint@9.24.0", "PINNED_DEBT_PY=complexipy==8.3.0",
            "zsh", str(ROOT / "pinned-debt/pinned-debt"),
            str(self.repo), str(second), "--out", str(self.root / "output folder"),
            "--since", "6 months ago",
        ])

    def test_debt_print_store_uses_linux(self):
        result = self.run_skill("pinned-debt", "--print-store")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(Path(self.command()[0]).name, "limactl")
        self.assertEqual(self.command()[-1], "--print-store")

    def test_default_formatter_resolves_without_repo_node_modules(self):
        result = self.run_skill("pinned-eslint", self.repo, platform="linux-gnu")
        self.assertEqual(result.returncode, 0, result.stderr)
        command = self.command()
        formatter = command[command.index("--format") + 1]
        self.assertEqual(
            formatter,
            str(self.root / "cache/pinned-eslint/test/node_modules/eslint-formatter-unix/index.js"),
        )

    def test_linux_runners_keep_bubblewrap(self):
        for name in ("pinned-eslint", "pinned-debt"):
            with self.subTest(skill=name):
                result = self.run_skill(name, self.repo, platform="linux-gnu")
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(Path(self.command()[0]).name, "bwrap")
                self.assertIn("--unshare-net", self.command())


if __name__ == "__main__":
    unittest.main()
