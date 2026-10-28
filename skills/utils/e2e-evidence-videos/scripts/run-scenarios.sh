#!/usr/bin/env bash
# Run e2e scenarios one per Playwright run, recording a 1280x720 video of each, pass or fail.
#
# usage: run-scenarios.sh <workdir> <id>=<generated-spec>:<line> [<id>=<spec>:<line> ...]
#   e.g. run-scenarios.sh /tmp/ngs-videos \
#          4202-1=.features-gen/all/src/tests/features/scheduler/appointment/reschedule-provider-location.feature.spec.js:19
#
# Env:
#   E2E_REPO               e2e repo (default ~/git.work/353.e2e-bdd-playwright)
#   PROJECT                Playwright project (default chromium-scheduler)
#   MFE_EHR_SCHEDULER_URL  set it to test a local MFE build (see build-local-mfe.sh); unset = deployed code
#   E2E_AWS_PROFILE, E2E_ENV, E2E_USER_ROLE  (defaults rt-devops-assuresoft, sqa, FRONT_OFFICE). The shell's
#                          own AWS_PROFILE/ENV are ignored on purpose: a stray profile breaks global setup.
#
# Writes per id: <workdir>/<id>/<test>/video.webm, <workdir>/<id>.steps.json, <workdir>/<id>.log
set -u
[ $# -ge 2 ] || { sed -n 2,14p "$0"; exit 2; }

SKILL_DIR=$(cd "$(dirname "$0")" && pwd)
WORKDIR=$(mkdir -p "$1" && cd "$1" && pwd); shift
E2E_REPO=${E2E_REPO:-$HOME/git.work/353.e2e-bdd-playwright}
PROJECT=${PROJECT:-chromium-scheduler}
export AWS_PROFILE=${E2E_AWS_PROFILE:-rt-devops-assuresoft} ENV=${E2E_ENV:-sqa} USER_ROLE=${E2E_USER_ROLE:-FRONT_OFFICE}
CONFIG=playwright.video.local.config.ts

cd "$E2E_REPO" || exit 1
[ -e "$CONFIG" ] && { echo "$E2E_REPO/$CONFIG already exists; remove it first"; exit 1; }
# Untracked override: video on for every project, removed again on exit.
cat > "$CONFIG" <<'EOF'
// Local only, never commit: record a 1280x720 video of every test, pass or fail.
import base from './playwright.config';

const VIDEO = { mode: 'on', size: { width: 1280, height: 720 } } as const;

export default {
  ...base,
  use: { ...base.use, video: VIDEO },
  projects: base.projects?.map((p) => ({ ...p, use: { ...p.use, video: VIDEO } })),
};
EOF
trap 'rm -f "$E2E_REPO/$CONFIG"' EXIT

echo "e2e repo: $E2E_REPO on $(git branch --show-current) @ $(git rev-parse --short HEAD)"
echo "AWS_PROFILE=$AWS_PROFILE ENV=$ENV USER_ROLE=$USER_ROLE"
echo "MFE override: ${MFE_EHR_SCHEDULER_URL:-none (deployed code)}"
for arg in "$@"; do
  id=${arg%%=*}; loc=${arg#*=}
  rm -rf "${WORKDIR:?}/$id"
  echo "### START $id $(date +%T)"
  # The spec path must come before --project: --project takes several values and would swallow it.
  STEP_LOG="$WORKDIR/$id.steps.json" timeout 900 npx playwright test -c "$CONFIG" "$loc" \
    --project "$PROJECT" --workers=1 --retries=0 \
    --reporter="list,$SKILL_DIR/step-reporter.cjs" --output="$WORKDIR/$id" > "$WORKDIR/$id.log" 2>&1
  echo "### END $id exit=$? $(date +%T)"
  grep -E '^\s+(✓|✘)' "$WORKDIR/$id.log" | sed -E 's/ @.*\(/ (/' | cut -c1-200
done
echo ALL_DONE
