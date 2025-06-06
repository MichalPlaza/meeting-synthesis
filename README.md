# Meeting Synthesis

Asystent do analizy i zarządzania wiedzą ze spotkań wykorzystujący narzędzia ML, z opcją przetwarzania lokalnego dla maksymalnej prywatności. Projekt ma na celu automatyzację tworzenia notatek, ekstrakcję kluczowych informacji oraz budowanie spójnej, przeszukiwalnej bazy wiedzy projektowej.

**Status Projektu:** Wczesna faza rozwoju. Funkcjonalności są aktywnie rozwijane.

**Link do Pełnej Wizji Produktu:** [Wizja Produktu na GitHub Wiki](https://github.com/mplazax/meeting-syntesis/wiki/Wizja-Produktu)

## Spis Treści

- [Technologie](#technologie)
- [Struktura Projektu](#struktura-projektu)
- [Uruchomienie Środowiska Deweloperskiego](#uruchomienie-środowiska-deweloperskiego)
  - [Wymagania Wstępne](#wymagania-wstępne)
  - [Konfiguracja i Start (Docker Compose)](#konfiguracja-i-start-docker-compose)
  - [Rozwój Pojedynczego Serwisu (Tryb Hybrydowy)](#rozwój-pojedynczego-serwisu-tryb-hybrydowy)
- [Testowanie](#testowanie)
- [Narzędzia Deweloperskie i Standardy Kodu](#narzędzia-deweloperskie-i-standardy-kodu)
  - [Linting i Formatowanie](#linting-i-formatowanie)
  - [Sprawdzanie Typów](#sprawdzanie-typów)
  - [Pre-commit Hooks](#pre-commit-hooks)
- [Konwencje Projektowe](#konwencje-projektowe)
  - [Branching (GitHub Flow)](#branching-github-flow)
  - [Konwencja Nazewnictwa Commitów (Conventional Commits)](#konwencja-nazewnictwa-commitów-conventional-commits)
- [Zgłaszanie Błędów i Propozycje](#zgłaszanie-błędów-i-propozycje)
- [Licencja](#licencja)

## Technologie

- **Backend:** Python 3.11+, FastAPI, Poetry
- **Frontend:** TypeScript, React (z Vite), PNPM
- **Baza Danych:** MongoDB
- **Broker Zadań:** Redis
- **Przetwarzanie w Tle:** Celery
- **Przetwarzanie Audio/AI:**
  - Transkrypcja: OpenAI Whisper
  - Identyfikacja Mówców: `pyannote-audio`
  - Analiza Treści (LLM): OpenAI API (docelowo również modele lokalne)
- **Konteneryzacja:** Docker, Docker Compose

## Struktura Projektu

Projekt jest podzielony na główne komponenty:

- `backend/`: Zawiera logikę serwerową aplikacji (API, zadania Celery, etc.).
- `frontend/`: Zawiera interfejs użytkownika.
- `docker-compose.yml`: Definiuje i łączy wszystkie usługi aplikacji.
- `.env.example`: Szablon dla zmiennych środowiskowych całego projektu.
- `scripts/`: Skrypty pomocnicze (np. do pobierania modeli).

## Uruchomienie Środowiska Deweloperskiego

### Wymagania Wstępne

Główną metodą uruchomienia jest Docker, co minimalizuje wymagania na maszynie hosta.

- [Git](https://git-scm.com/)
- [Docker](https://www.docker.com/get-started) i Docker Compose

Instalacja Pythona czy Node.js na maszynie hosta nie jest wymagana do podstawowego uruchomienia aplikacji.

### Konfiguracja i Start (Docker Compose)

Jest to **zalecana i główna metoda** uruchamiania całej aplikacji. Gwarantuje spójne środowisko dla wszystkich usług.

1.  **Sklonuj repozytorium (jeśli jeszcze tego nie zrobiłeś):**

    ```bash
    git clone https://github.com/mplazax/meeting-syntesis.git
    cd meeting-syntesis
    ```

2.  **Skonfiguruj zmienne środowiskowe:**
    Projekt używa jednego pliku `.env` w głównym katalogu do zarządzania całą konfiguracją.

    ```bash
    # Skopiuj szablon do właściwego pliku .env
    cp .env.example .env
    ```

    Następnie otwórz plik `.env` i uzupełnij wymagane wartości, takie jak `OPENAI_API_KEY` i `SECRET_KEY`. Domyślne wartości dla baz danych są już skonfigurowane do pracy wewnątrz sieci Docker.

3.  **Zbuduj i uruchom kontenery:**
    Ta komenda pobierze obrazy, zbuduje Twoje usługi i uruchomi cały stos w tle.

    ```bash
    docker-compose up --build -d
    ```

    - `backend` API będzie dostępne pod `http://localhost:8000`
    - `frontend` będzie dostępny pod `http://localhost:5173` (lub innym portem zmapowanym w `docker-compose.yml`)

4.  **Aby zatrzymać wszystkie usługi:**

    ```bash
    docker-compose down
    ```

### Rozwój Pojedynczego Serwisu (Tryb Hybrydowy)

Jeśli aktywnie pracujesz nad jedną częścią aplikacji (np. frontendem) i chcesz korzystać z szybszego auto-reload (HMR), możesz uruchomić większość usług w Dockerze, a jedną manualnie.

**Przykład: Praca nad frontendem z resztą usług w tle**

1.  Uruchom usługi zależne (backend, bazy danych) w Dockerze:
    ```bash
    docker-compose up -d backend mongo redis
    ```
2.  Zainstaluj zależności frontendu lokalnie:
    ```bash
    # Upewnij się, że masz zainstalowany Node.js i pnpm
    # Jeśli nie masz pnpm: corepack enable
    cd frontend
    pnpm install
    ```
3.  Uruchom serwer deweloperski Vite:
    ```bash
    pnpm run dev
    ```
    Frontend będzie teraz działał z HMR, komunikując się z backendem działającym w kontenerze.

## Testowanie

Zalecane jest uruchamianie testów wewnątrz kontenerów, aby zapewnić spójność środowiska.

1.  **Backend (pytest):**

    ```bash
    docker-compose exec backend pytest
    ```

2.  **Frontend (Vitest):**
    ```bash
    docker-compose exec frontend pnpm test
    ```

## Narzędzia Deweloperskie i Standardy Kodu

Dążymy do utrzymania wysokiej jakości kodu poprzez użycie następujących narzędzi i standardów.

### Linting i Formatowanie

- **Narzędzie Główne Python:** [Ruff](https://beta.ruff.rs/docs/)
  Ruff jest używany do lintowania i formatowania kodu Python. Konfiguracja znajduje się w pliku `backend/pyproject.toml`.

### Sprawdzanie Typów

- **Python:** [Mypy](http://mypy-lang.org/)
  Mypy jest używane do statycznej analizy typów w kodzie Python. Konfiguracja znajduje się w pliku `backend/pyproject.toml`.

### Pre-commit Hooks

Zalecamy użycie pre-commit hooks do automatycznego uruchamiania linterów i formatterów przed każdym commitem.

**Instalacja i Konfiguracja (jednorazowa):**

1.  Zainstaluj `pre-commit`:
    ```bash
    pip install pre-commit
    ```
2.  Zainstaluj hooki w swoim lokalnym repozytorium:
    ```bash
    pre-commit install
    ```
    Przykładowa konfiguracja (`.pre-commit-config.yaml`) zostanie dodana do projektu. Będzie ona zawierać hooki dla Ruff i Mypy.

## Konwencje Projektowe

### Branching (GitHub Flow)

Projekt stosuje strategię [GitHub Flow](https://docs.github.com/en/get-started/quickstart/github-flow):

1.  Branch `main` jest zawsze źródłem prawdy i powinien być stabilny.
2.  Nowe funkcje i poprawki są rozwijane na dedykowanych **feature branchach** tworzonych z `main`.
    - Sugerowane nazewnictwo: `typ/opis-zadania` (np. `feat/user-auth`, `fix/transcription-error`).
3.  Po ukończeniu prac, tworzony jest **Pull Request (PR)** z feature brancha do `main`.
4.  PR jest przeglądany, a testy CI muszą przejść.
5.  Po zatwierdzeniu, PR jest mergowany do `main`.
6.  Feature branch jest usuwany po zmergowaniu.

### Konwencja Nazewnictwa Commitów (Conventional Commits)

Wszystkie commity powinny być zgodne ze specyfikacją [Conventional Commits](https://www.conventionalcommits.org/).

Format: `type(scope): subject`

Przykładowe typy: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`.

## Zgłaszanie Błędów i Propozycje

Wszelkie błędy, problemy lub propozycje nowych funkcjonalności prosimy zgłaszać poprzez [GitHub Issues](https://github.com/mplazax/meeting-syntesis/issues) w tym repozytorium.

## Licencja

(Do ustalenia - na razie projekt nie posiada formalnej licencji.)
