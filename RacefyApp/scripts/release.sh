#!/bin/bash

# ============================================================
#  Racefy — podbicie wersji aplikacji
#  Bump package.json + package-lock.json, commit i tag.
# ============================================================
#
# Dlaczego to nie jest samo `npm version`:
#
# `npm version` sam commituje i taguje, ale TYLKO gdy package.json leży
# w katalogu głównym repozytorium git. Tutaj leży w RacefyApp/, a .git jest
# poziom wyżej — npm uznaje więc, że nie jest w repo, po cichu podbija sam plik
# i wychodzi. Efekt: wersja wisiała niezacommitowana, a repo nie miało ani
# jednego taga. Sprawdzone: package.json w rootcie repo → commit + tag,
# package.json w podkatalogu → tylko zmieniony plik.
#
# Dlatego część gitową robimy tu jawnie.

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
cd "$APP_DIR"

LEVEL="${1:-}"

if [[ ! "$LEVEL" =~ ^(patch|minor|major)$ ]]; then
    echo -e "${RED}✖ Podaj poziom: patch | minor | major${NC}"
    echo -e "  ${DIM}np. npm run release:minor${NC}"
    exit 1
fi

# Wszystko poza plikami wersji musi być zacommitowane — inaczej commit
# releasowy zgarnąłby cudze zmiany albo lint-staged przepuściłby je bokiem.
OTHER_CHANGES=$(git status --porcelain | grep -v -E 'RacefyApp/package(-lock)?\.json$' || true)
if [[ -n "$OTHER_CHANGES" ]]; then
    echo -e "${RED}✖ Drzewo robocze nie jest czyste:${NC}"
    echo "$OTHER_CHANGES" | head -10
    echo -e "  ${DIM}Zacommituj zmiany i spróbuj ponownie.${NC}"
    exit 1
fi

CURRENT=$(node -p "require('./package.json').version")

# --no-git-tag-version jest tu jawne, a nie domyślne: chcemy, żeby z kodu było
# widać, że npm ma ruszyć wyłącznie pliki.
npm version "$LEVEL" --no-git-tag-version >/dev/null

NEW=$(node -p "require('./package.json').version")
TAG="v${NEW}"

if git rev-parse -q --verify "refs/tags/${TAG}" >/dev/null; then
    echo -e "${RED}✖ Tag ${TAG} już istnieje.${NC}"
    echo -e "  ${DIM}Cofam zmianę w plikach.${NC}"
    npm version "$CURRENT" --no-git-tag-version --allow-same-version >/dev/null
    exit 1
fi

git add package.json package-lock.json
git commit -q -m "chore(release): ${TAG}"
git tag "$TAG"

echo -e "${GREEN}✔${NC} ${BOLD}${CURRENT} → ${NEW}${NC}"
echo -e "  ${DIM}commit + tag ${TAG}${NC}"
echo -e "  ${CYAN}git push --follow-tags${NC} ${DIM}— żeby tag poszedł na zdalne repo${NC}"
