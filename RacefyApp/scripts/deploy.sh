#!/bin/bash

# ============================================================
#  Racefy - Build & Deploy Helper
#  Interaktywny skrypt do budowania i deployu aplikacji
# ============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m' # No Color

# Navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# ── Helpers ──────────────────────────────────────────────────

print_header() {
    echo ""
    echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${CYAN}║        🏁  Racefy Deploy Helper  🏁         ║${NC}"
    echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════╝${NC}"
    echo ""
}

print_step() {
    echo -e "\n${BOLD}${GREEN}▶ $1${NC}"
}

print_info() {
    echo -e "  ${DIM}$1${NC}"
}

print_warn() {
    echo -e "  ${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "  ${RED}✖ $1${NC}"
}

print_success() {
    echo -e "  ${GREEN}✔ $1${NC}"
}

confirm() {
    local prompt="$1"
    echo -e -n "\n  ${BOLD}${prompt}${NC} [T/n]: "
    read -r answer
    [[ -z "$answer" || "$answer" =~ ^[TtYy] ]]
}

press_enter() {
    echo -e -n "\n  ${DIM}Naciśnij Enter aby kontynuować...${NC}"
    read -r
}

# ── Checks ───────────────────────────────────────────────────

check_eas_cli() {
    if ! command -v eas &> /dev/null; then
        print_error "EAS CLI nie jest zainstalowany!"
        echo -e "  Zainstaluj: ${CYAN}npm install -g eas-cli${NC}"
        exit 1
    fi
    print_success "EAS CLI zainstalowany ($(eas --version 2>/dev/null || echo 'unknown'))"
}

check_eas_login() {
    local user
    user=$(eas whoami 2>/dev/null || true)
    if [[ -z "$user" ]]; then
        print_warn "Nie jesteś zalogowany do EAS"
        echo -e "  Loguję..."
        eas login
    else
        print_success "Zalogowany jako: ${BOLD}$user${NC}"
    fi
}

check_git_status() {
    local changes
    changes=$(git status --porcelain 2>/dev/null | head -5)
    if [[ -n "$changes" ]]; then
        print_warn "Masz niezacommitowane zmiany:"
        git status --short | head -10
        echo ""
        if ! confirm "Kontynuować mimo to?"; then
            echo -e "  ${DIM}Zacommituj zmiany i spróbuj ponownie.${NC}"
            exit 0
        fi
    else
        print_success "Repozytorium czyste"
    fi
}

show_app_config() {
    print_step "Konfiguracja aplikacji"

    # Parse from app.config.ts
    local version=$(grep -oP "version:\s*'[^']*'" app.config.ts | head -1 | grep -oP "'[^']*'" | tr -d "'")
    local build_number=$(grep -oP "buildNumber:\s*'[^']*'" app.config.ts | grep -oP "'[^']*'" | tr -d "'")
    local version_code=$(grep -oP "versionCode:\s*\d+" app.config.ts | grep -oP "\d+")
    local bundle_id=$(grep -oP "bundleIdentifier:\s*'[^']*'" app.config.ts | grep -oP "'[^']*'" | tr -d "'")
    local package_name=$(grep -oP "package:\s*'[^']*'" app.config.ts | grep -oP "'[^']*'" | tr -d "'")

    echo -e "  ${BOLD}Version:${NC}         ${version:-?}"
    echo -e "  ${BOLD}iOS Build:${NC}       ${build_number:-?}"
    echo -e "  ${BOLD}Android Code:${NC}    ${version_code:-?}"
    echo -e "  ${BOLD}iOS Bundle:${NC}      ${bundle_id:-?}"
    echo -e "  ${BOLD}Android Pkg:${NC}     ${package_name:-?}"

    # EAS env from eas.json per profile
    echo ""
    echo -e "  ${BOLD}${DIM}eas.json env:${NC}"

    local staging_env=$(python3 -c "
import json
with open('eas.json') as f:
    d = json.load(f)
env = d.get('build',{}).get('staging',{}).get('env',{})
for k,v in sorted(env.items()):
    print(f'    {k}={v}')
" 2>/dev/null || echo "    (nie można odczytać)")

    local prod_env=$(python3 -c "
import json
with open('eas.json') as f:
    d = json.load(f)
env = d.get('build',{}).get('production',{}).get('env',{})
for k,v in sorted(env.items()):
    print(f'    {k}={v}')
" 2>/dev/null || echo "    (nie można odczytać)")

    echo -e "  ${CYAN}staging:${NC}"
    echo -e "$staging_env"
    echo -e "  ${CYAN}production:${NC}"
    echo -e "$prod_env"
}

run_checks() {
    print_step "Sprawdzam środowisko..."
    check_eas_cli
    check_eas_login
    check_git_status
    show_app_config
}

# ── Build Functions ──────────────────────────────────────────

build_android_staging() {
    print_step "Android Staging (APK do testów)"
    print_info "Profil: staging"
    print_info "API: https://app.dev.racefy.io/api"
    print_info "Output: APK (do bezpośredniej instalacji)"
    print_info "Logi: włączone (debug)"
    echo ""
    print_info "Komenda: eas build --platform android --profile staging"

    if confirm "Rozpocząć build?"; then
        echo ""
        eas build --platform android --profile staging
        echo ""
        print_success "Build zlecony! Śledź postęp na:"
        print_info "https://expo.dev/accounts/sebastiantarka/projects/RacefyApp/builds"
    fi
}

build_android_production() {
    print_step "Android Production (AAB do Google Play)"
    print_info "Profil: production"
    print_info "API: produkcja (wg konfiguracji w eas.json)"
    print_info "Output: AAB (do uploadu na Google Play)"
    echo ""
    print_info "Komenda: eas build --platform android --profile production"

    if confirm "Rozpocząć build?"; then
        echo ""
        eas build --platform android --profile production
        echo ""
        print_success "Build zlecony!"
        print_info "Po zakończeniu upload AAB do Google Play Console:"
        print_info "https://play.google.com/console"
    fi
}

build_ios_testflight() {
    print_step "iOS TestFlight (do testów z przyjaciółmi)"
    print_info "Profil: production"
    print_info "API: staging (https://app.dev.racefy.io/api)"
    print_info "Dystrybucja: TestFlight (do 10,000 testerów)"
    print_info "Nie wymaga UDID urządzeń"
    echo ""

    echo -e "  ${BOLD}Opcje:${NC}"
    echo -e "  ${CYAN}1)${NC} Build + automatyczny submit do TestFlight ${DIM}(zalecane)${NC}"
    echo -e "  ${CYAN}2)${NC} Tylko build (submit później)"
    echo -e -n "\n  Wybierz [1/2]: "
    read -r choice

    case "$choice" in
        2)
            print_info "Komenda: eas build --platform ios --profile production"
            if confirm "Rozpocząć build?"; then
                echo ""
                eas build --platform ios --profile production
                echo ""
                print_success "Build zlecony!"
                print_info "Po zakończeniu możesz submitować:"
                print_info "  eas submit --platform ios --latest"
            fi
            ;;
        *)
            print_info "Komenda: eas build --platform ios --profile production --auto-submit"
            if confirm "Rozpocząć build + submit?"; then
                echo ""
                eas build --platform ios --profile production --auto-submit
                echo ""
                print_success "Build + submit zlecony!"
                print_info "Po przetworzeniu przez Apple (~5-15 min) build pojawi się w TestFlight"
                print_info "Sprawdź status: https://appstoreconnect.apple.com/"
                echo ""
                print_step "Następne kroki:"
                print_info "1. Poczekaj aż build pojawi się w App Store Connect → TestFlight"
                print_info "2. Dodaj testerów: TestFlight → Internal/External Testing → Add Group"
                print_info "3. Testerzy dostaną zaproszenie emailem"
                print_info "4. Instalują TestFlight z App Store i otwierają link"
            fi
            ;;
    esac
}

build_ios_staging() {
    print_step "iOS Staging (Ad-Hoc, wymaga UDID)"
    print_info "Profil: staging"
    print_info "API: staging"
    print_info "Dystrybucja: Internal (Ad-Hoc, max 100 urządzeń)"
    print_warn "Wymaga zarejestrowanych UDID urządzeń!"
    echo ""
    print_info "Komenda: eas build --platform ios --profile staging"

    if confirm "Rozpocząć build?"; then
        echo ""
        eas build --platform ios --profile staging
        echo ""
        print_success "Build zlecony!"
        print_info "Po zakończeniu pobierz .ipa i zainstaluj przez Xcode/Apple Configurator"
    fi
}

# ── Submit Functions ─────────────────────────────────────────

submit_ios_testflight() {
    print_step "Submit ostatniego iOS buildu do TestFlight"
    print_info "Wysyła najnowszy iOS build do App Store Connect / TestFlight"
    echo ""
    print_info "Komenda: eas submit --platform ios --latest"

    if confirm "Wysłać do TestFlight?"; then
        echo ""
        eas submit --platform ios --latest
        echo ""
        print_success "Submit zakończony!"
        print_info "Sprawdź status w App Store Connect → TestFlight"
        print_info "https://appstoreconnect.apple.com/"
    fi
}

# ── Status Functions ─────────────────────────────────────────

show_build_history() {
    print_step "Historia buildów"
    echo ""
    echo -e "  ${BOLD}Platforma:${NC}"
    echo -e "  ${CYAN}1)${NC} Android"
    echo -e "  ${CYAN}2)${NC} iOS"
    echo -e "  ${CYAN}3)${NC} Wszystkie"
    echo -e -n "\n  Wybierz [1/2/3]: "
    read -r choice

    echo ""
    case "$choice" in
        1) eas build:list --platform android --limit 5 ;;
        2) eas build:list --platform ios --limit 5 ;;
        *) eas build:list --limit 10 ;;
    esac
}

show_env_vars() {
    print_step "Zmienne środowiskowe EAS"
    echo ""
    echo -e "  ${BOLD}Środowisko:${NC}"
    echo -e "  ${CYAN}1)${NC} Preview (staging)"
    echo -e "  ${CYAN}2)${NC} Production"
    echo -e "  ${CYAN}3)${NC} Development"
    echo -e -n "\n  Wybierz [1/2/3]: "
    read -r choice

    echo ""
    case "$choice" in
        1) eas env:list preview --include-sensitive ;;
        2) eas env:list production --include-sensitive ;;
        3) eas env:list development --include-sensitive ;;
    esac
}

# ── Local Build ──────────────────────────────────────────────

build_android_local() {
    print_step "Lokalny build Android (APK)"
    print_info "Buduje APK lokalnie bez EAS cloud"
    print_info "Wymaga: Android SDK, JAVA_HOME, ANDROID_HOME"
    echo ""

    # Check prerequisites
    if [[ -z "$ANDROID_HOME" ]]; then
        print_warn "ANDROID_HOME nie ustawiony"
        print_info "Ustaw zmienną lub podaj ścieżkę do Android SDK"
    fi

    if confirm "Wygenerować native project i zbudować?"; then
        print_step "1/3 Generuję native project..."
        npx expo prebuild --platform android --clean

        print_step "2/3 Buduję APK..."
        local java_home="${JAVA_HOME:-$HOME/android-studio/jbr}"
        local android_home="${ANDROID_HOME:-$HOME/Android/Sdk}"

        JAVA_HOME="$java_home" \
        ANDROID_HOME="$android_home" \
        ./android/gradlew app:assembleRelease -x lint -x lintRelease -x lintVitalRelease

        local apk_path="android/app/build/outputs/apk/release/app-release.apk"
        if [[ -f "$apk_path" ]]; then
            print_success "APK zbudowany: $apk_path"

            if confirm "Zainstalować na podłączonym urządzeniu?"; then
                adb install "$apk_path"
                print_success "Zainstalowano!"
            fi
        else
            print_error "APK nie znaleziony w oczekiwanej lokalizacji"
        fi
    fi
}

# ── Dev Install ──────────────────────────────────────────────

install_android_dev() {
    print_step "Instalacja na telefonie (tryb development)"
    print_info "Buduje debug APK i instaluje na podłączonym urządzeniu"
    echo ""

    # Check for connected devices
    local devices
    devices=$(adb devices 2>/dev/null | grep -v "List of devices" | grep "device$" | wc -l)
    if [[ "$devices" -eq 0 ]]; then
        print_error "Brak podłączonych urządzeń! Podłącz telefon przez USB i włącz USB debugging."
        return 1
    fi
    print_success "Wykryto $devices urządzenie(a)"
    adb devices | grep -v "List of devices" | grep "device$"
    echo ""

    echo -e "  ${BOLD}Metoda instalacji:${NC}"
    echo -e "  ${CYAN}1)${NC} expo run:android ${DIM}— automatyczny build + install (zalecane)${NC}"
    echo -e "  ${CYAN}2)${NC} Lokalny debug APK ${DIM}— gradlew assembleDebug + adb install${NC}"
    echo -e -n "\n  Wybierz [1/2]: "
    read -r choice

    echo ""
    case "$choice" in
        2)
            print_step "1/3 Generuję native project..."
            npx expo prebuild --platform android

            print_step "2/3 Buduję debug APK..."
            local java_home="${JAVA_HOME:-$HOME/android-studio/jbr}"
            local android_home="${ANDROID_HOME:-$HOME/Android/Sdk}"

            JAVA_HOME="$java_home" \
            ANDROID_HOME="$android_home" \
            ./android/gradlew app:assembleDebug

            local apk_path="android/app/build/outputs/apk/debug/app-debug.apk"
            if [[ -f "$apk_path" ]]; then
                print_step "3/3 Instaluję na urządzeniu..."
                adb install -r "$apk_path"
                print_success "Zainstalowano! Uruchom 'npm run start:adb' aby połączyć z dev serverem."
            else
                print_error "APK nie znaleziony: $apk_path"
            fi
            ;;
        *)
            print_info "Komenda: npx expo run:android"
            print_warn "To polecenie samo buduje i instaluje app na urządzeniu."
            echo ""
            npx expo run:android
            ;;
    esac
}

# ── Dev Server ───────────────────────────────────────────────

start_dev_server() {
    print_step "Start serwera deweloperskiego"
    echo ""
    echo -e "  ${BOLD}Tryb:${NC}"
    echo -e "  ${CYAN}1)${NC} USB (adb reverse) ${DIM}— zalecane dla urządzeń USB${NC}"
    echo -e "  ${CYAN}2)${NC} Standard (expo start)"
    echo -e "  ${CYAN}3)${NC} Clear cache (expo start --clear)"
    echo -e -n "\n  Wybierz [1/2/3]: "
    read -r choice

    echo ""
    case "$choice" in
        1)
            print_info "Komenda: npm run start:adb"
            npm run start:adb
            ;;
        2)
            print_info "Komenda: npx expo start"
            npx expo start
            ;;
        3)
            print_info "Komenda: npx expo start --clear"
            npx expo start --clear
            ;;
    esac
}

# ── Main Menu ────────────────────────────────────────────────

show_menu() {
    echo ""
    echo -e "${BOLD}══════════════════════════════════════════════${NC}"
    echo -e "${BOLD} Co chcesz zrobić?${NC}"
    echo -e "${BOLD}══════════════════════════════════════════════${NC}"
    echo ""
    echo -e " ${BOLD}${GREEN}📱 ANDROID${NC}"
    echo -e "  ${CYAN}1)${NC}  Staging APK ${DIM}— do testów (staging API)${NC}"
    echo -e "  ${CYAN}2)${NC}  Production AAB ${DIM}— do Google Play${NC}"
    echo -e "  ${CYAN}3)${NC}  Lokalny APK ${DIM}— build bez EAS cloud${NC}"
    echo ""
    echo -e " ${BOLD}${GREEN}🍎 iOS${NC}"
    echo -e "  ${CYAN}4)${NC}  TestFlight ${DIM}— build + wyślij do testerów (najłatwiejsze)${NC}"
    echo -e "  ${CYAN}5)${NC}  Staging Ad-Hoc ${DIM}— .ipa (wymaga UDID urządzeń)${NC}"
    echo -e "  ${CYAN}6)${NC}  Submit do TestFlight ${DIM}— wyślij istniejący build${NC}"
    echo ""
    echo -e " ${BOLD}${GREEN}🛠  DEV & STATUS${NC}"
    echo -e "  ${CYAN}7)${NC}  Start dev server ${DIM}— uruchom Expo (USB/standard/clear)${NC}"
    echo -e "  ${CYAN}d)${NC}  Zainstaluj na telefonie ${DIM}— debug build na podłączone urządzenie${NC}"
    echo -e "  ${CYAN}8)${NC}  Historia buildów ${DIM}— lista ostatnich buildów${NC}"
    echo -e "  ${CYAN}9)${NC}  Zmienne środowiskowe ${DIM}— pokaż EAS env vars${NC}"
    echo ""
    echo -e "  ${CYAN}0)${NC}  Wyjdź"
    echo ""
    echo -e -n " ${BOLD}Wybierz opcję: ${NC}"
}

main() {
    print_header
    run_checks

    while true; do
        show_menu
        read -r option

        case "$option" in
            1) build_android_staging ;;
            2) build_android_production ;;
            3) build_android_local ;;
            4) build_ios_testflight ;;
            5) build_ios_staging ;;
            6) submit_ios_testflight ;;
            7) start_dev_server ;;
            d|D) install_android_dev ;;
            8) show_build_history ;;
            9) show_env_vars ;;
            0)
                echo -e "\n${DIM}Do zobaczenia! 👋${NC}\n"
                exit 0
                ;;
            *)
                print_error "Nieznana opcja: $option"
                ;;
        esac

        press_enter
    done
}

main "$@"