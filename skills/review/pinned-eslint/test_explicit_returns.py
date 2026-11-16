import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


RULE = "@typescript-eslint/explicit-function-return-type"
SKILL_DIR = Path(__file__).resolve().parent
CASES = {
    "declaration": (
        "export function count() { return 1; }",
        "export function count(): number { return 1; }",
    ),
    "expression": (
        "export const count = function () { return 1; };",
        "export const count = function (): number { return 1; };",
    ),
    "arrow": (
        "export const count = () => 1;",
        "export const count = (): number => 1;",
    ),
    "callback": (
        "export const counts = [1].map((value) => value + 1);",
        "export const counts = [1].map((value): number => value + 1);",
    ),
    "typed": (
        "export const count: () => number = () => 1;",
        "export const count: () => number = (): number => 1;",
    ),
    "factory": (
        "export function withCount(value: number) {\n"
        "  return (): number => value;\n}",
        "export function withCount(value: number): () => number {\n"
        "  return (): number => value;\n}",
    ),
    "wrapper": (
        "export function withCount(value: number): () => number {\n"
        "  return () => value;\n}",
        "export function withCount(value: number): () => number {\n"
        "  return (): number => value;\n}",
    ),
    "literal": (
        "export const status = () => 'ready' as const;",
        "export const status = (): 'ready' => 'ready';",
    ),
    "void": (
        "export const finish = () => void 0;",
        "export const finish = (): void => { return; };",
    ),
    "iife": (
        "export const count = (function () { return 1; })();",
        "export const count = (function (): number { return 1; })();",
    ),
    "method": (
        "export const counter = { read() { return 1; } };",
        "export const counter = { read(): number { return 1; } };",
    ),
    "async": (
        "export async function count() {\n"
        "  const value = await Promise.resolve(1);\n  return value;\n}",
        "export async function count(): Promise<number> {\n"
        "  const value = await Promise.resolve(1);\n  return value;\n}",
    ),
    "component": (
        "export function Panel() { return null; }",
        "export function Panel(): null { return null; }",
    ),
    "module": (
        "export function count() { return 1; }",
        "export function count(): number { return 1; }",
    ),
    "commonjs": (
        "export function count() { return 1; }",
        "export function count(): number { return 1; }",
    ),
}


class ExplicitReturnTypesTest(unittest.TestCase):
    def test_return_annotations(self):
        temporary_root = "/private/tmp" if sys.platform == "darwin" else None
        with tempfile.TemporaryDirectory(dir=temporary_root) as directory:
            root = Path(directory).resolve()
            (root / "tsconfig.json").write_text(json.dumps({
                "compilerOptions": {
                    "target": "ES2023",
                    "module": "ESNext",
                    "moduleResolution": "Bundler",
                    "strict": True,
                    "skipLibCheck": True,
                },
                "include": ["*.ts", "*.tsx", "*.mts", "*.cts"],
            }))
            (root / "package.json").write_text('{"type":"module"}')
            for name, snippets in CASES.items():
                suffix = {
                    "component": "tsx", "module": "mts", "commonjs": "cts",
                }.get(name, "ts")
                for kind, snippet in zip(("implicit", "explicit"), snippets):
                    (root / f"{kind}-{name}.{suffix}").write_text(snippet + "\n")
            report = root / "report.json"
            result = subprocess.run(
                [str(SKILL_DIR / "pinned-eslint"), str(root),
                 "--report", str(report), "--", "--format", "json", "."],
                capture_output=True, text=True, timeout=120, check=False,
            )
            self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
            diagnostics = {
                Path(entry["filePath"]).stem: entry["messages"]
                for entry in json.loads(report.read_text())
            }
            for name in CASES:
                with self.subTest(case=name):
                    implicit = diagnostics[f"implicit-{name}"]
                    explicit = diagnostics[f"explicit-{name}"]
                    violations = [item for item in implicit
                                  if item["ruleId"] == RULE]
                    self.assertEqual(len(violations), 1, implicit)
                    self.assertEqual(violations[0]["severity"], 2)
                    self.assertEqual(
                        [item for item in explicit if item["severity"] == 2],
                        [], explicit,
                    )


if __name__ == "__main__":
    unittest.main()
