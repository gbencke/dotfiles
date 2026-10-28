#!/usr/bin/env bash
# Production-build an MFE branch so e2e can run it inside the deployed SQA host.
#
# usage: build-local-mfe.sh <mfe-repo> <branch>
#   e.g. build-local-mfe.sh ~/git.work/307.ehr-scheduler-website-react NGS-4271-block-booking-during-proposal-recheck
#
# Why the .env swap: run-ehr-local.sh rewrites the repo's .env to point at local MFEs
# (MFE_EHR_SHARED_URL=https://local.raintreeinc.com:3002/...). A build with that .env asks for an
# ehr-shared that is not running, and the scheduler hangs on "Loading...". The build gets only the
# first (SQA) block of .env; the original .env and branch are always restored.
#
# Output: <mfe-repo>/build/<mfe-name>/ - serve it with
#   (cd ~/git.work/353.e2e-bdd-playwright && npm run mfe:serve -- <mfe-repo>/build)
set -euo pipefail
[ $# -eq 2 ] || { sed -n 2,13p "$0"; exit 2; }
REPO=$1 BRANCH=$2

cd "$REPO"
[ -z "$(git status --porcelain)" ] || { echo "$REPO has uncommitted changes; commit or stash them first"; exit 1; }
ORIG=$(git branch --show-current)
BACKUP=$(mktemp)
cp .env "$BACKUP"
restore() { cp "$BACKUP" .env; rm -f "$BACKUP"; git switch -q "$ORIG"; echo "restored .env and branch $ORIG"; }
trap restore EXIT

python3 - "$BACKUP" <<'EOF'
import sys
keep = ('APP_REGION', 'APP_APPSYNC_API_URL', 'APP_APPSYNC_TYPE', 'MFE_EHR_SHARED_URL')
seen = {}
for line in open(sys.argv[1]):
    line = line.strip()
    if line.startswith('#'):
        break  # the generated local-orchestration block starts with a comment
    if '=' in line:
        k, v = line.split('=', 1)
        if k in keep and k not in seen:
            seen[k] = v
seen['ENV'] = 'SQA'
open('.env', 'w').write(''.join(f'{k}={v}\n' for k, v in seen.items()))
print('build .env:', ', '.join(f'{k}={v}' for k, v in seen.items()))
EOF

git fetch -q origin "$BRANCH" || true
git switch -q "$BRANCH"
git merge -q --ff-only "origin/$BRANCH" 2>/dev/null || echo "note: local $BRANCH not fast-forwarded to origin"
echo "building $(git rev-parse --short HEAD) on $BRANCH ..."
npx webpack --config webpack/webpack.config.js --env env=prod
