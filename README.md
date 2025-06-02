# Meeting Synthesis

Asystent do analizy i zarządzania wiedzą ze spotkań wykorzystujący narzędzia ML, z opcją przetwarzania lokalnego dla maksymalnej prywatności. Projekt ma na celu automatyzację tworzenia notatek, ekstrakcję kluczowych informacji oraz budowanie spójnej, przeszukiwalnej bazy wiedzy projektowej.

**Status Projektu:** Wczesna faza rozwoju. Funkcjonalności są aktywnie rozwijane.

**Link do Pełnej Wizji Produktu:** [Wizja Produktu na GitHub Wiki](https://github.com/mplazax/meeting-syntesis/wiki/Wizja-Produktu)

## Spis Treści

- [Technologie](#technologie)
- [Struktura Projektu](#struktura-projektu)
- [Setup Lokalnego Środowiska Deweloperskiego](#setup-lokalnego-środowiska-deweloperskiego)
  - [Wymagania Wstępne](#wymagania-wstępne)
  - [Instalacja Zależności](#instalacja-zależności)
  - [Konfiguracja Środowiska (.env)](#konfiguracja-środowiska-env)
  - [Uruchamianie Komponentów](#uruchamianie-komponentów)
  - [Uruchamianie Całej Aplikacji (Docker Compose)](#uruchamianie-całej-aplikacji-docker-compose)
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

- **Backend:** Python 3.11+, FastAPI
- **Frontend:** TypeScript, React (z Vite)
- **Baza Danych:** MongoDB
- **Przetwarzanie Audio/AI:**
  - Transkrypcja: OpenAI Whisper
  - Identyfikacja Mówców: `pyannote-audio`
  - Analiza Treści (LLM): OpenAI API (docelowo również modele lokalne)
- **Konteneryzacja:** Docker, Docker Compose

## Struktura Projektu

Projekt jest podzielony na główne komponenty:

- `backend/`: Zawiera logikę serwerową aplikacji (API, przetwarzanie danych).
- `frontend/`: Zawiera interfejs użytkownika.
- `docker-compose.yml`: Definiuje usługi dla pełnego uruchomienia aplikacji.
- `scripts/`: Skrypty pomocnicze (np. do pobierania modeli).

## Setup Lokalnego Środowiska Deweloperskiego

### Wymagania Wstępne

- [Python](https://www.python.org/) (wersja 3.11 lub nowsza)
- [Node.js](https://nodejs.org/) (wersja LTS, np. 18.x lub 20.x) oraz npm
- [Docker](https://www.docker.com/get-started) i Docker Compose
- (Opcjonalnie, ale zalecane) [Git](https://git-scm.com/)

### Instalacja Zależności

1.  **Sklonuj repozytorium (jeśli jeszcze tego nie zrobiłeś):**

    ```bash
    git clone https://github.com/mplazax/meeting-syntesis.git
    cd meeting-syntesis
    ```

2.  **Backend (Python):**
    Zalecane jest użycie wirtualnego środowiska.

    ```bash
    cd backend
    python -m venv venv
    source venv/bin/activate  # Na Windows: venv\Scripts\activate
    pip install -r requirements.txt
    cd ..
    ```

3.  **Frontend (TypeScript/React):**
    ```bash
    cd frontend
    npm install
    cd ..
    ```

### Konfiguracja Środowiska (.env)

W przyszłości projekt będzie wykorzystywał pliki `.env` do zarządzania konfiguracją (np. klucze API, stringi połączeniowe do bazy danych).

Na obecnym etapie pliki `.env` nie są jeszcze w pełni skonfigurowane. Informacje o wymaganych zmiennych zostaną dodane w miarę rozwoju projektu. Przykładowy plik `.env.example` zostanie dostarczony.

### Uruchamianie Komponentów

Zalecane dla aktywnego dewelopmentu poszczególnych części aplikacji.

1.  **Baza Danych (MongoDB):**
    Najprościej uruchomić MongoDB jako kontener Docker:

    ```bash
    docker run -d -p 27017:27017 --name meeting-synthesis-mongo mongo
    ```

    (Jeśli kontener już istnieje i jest zatrzymany: `docker start meeting-synthesis-mongo`)

2.  **Backend (FastAPI):**
    Upewnij się, że wirtualne środowisko Pythona jest aktywne.

    ```bash
    cd backend
    # Uruchomienie serwera z auto-reload na porcie 8000
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
    ```

    API będzie dostępne pod adresem `http://localhost:8000`.

3.  **Frontend (React/Vite):**
    ```bash
    cd frontend
    npm run dev
    ```
    Aplikacja frontendowa będzie dostępna pod adresem wskazanym przez Vite (zazwyczaj `http://localhost:5173`).

### Uruchamianie Całej Aplikacji (Docker Compose)

Ta metoda uruchamia wszystkie usługi (backend, frontend, baza danych) zdefiniowane w `docker-compose.yml`. Jest to przydatne do testowania pełnej integracji.

```bash
docker-compose up -d --build
```

Aby zatrzymać usługi:

```bash
docker-compose down
```

## Testowanie

1.  **Backend (pytest):**
    Upewnij się, że wirtualne środowisko Pythona jest aktywne.

    ```bash
    cd backend
    pytest
    ```

2.  **Frontend (Vitest/Jest - zależnie od konfiguracji):**
    ```bash
    cd frontend
    npm test
    ```

## Narzędzia Deweloperskie i Standardy Kodu

Dążymy do utrzymania wysokiej jakości kodu poprzez użycie następujących narzędzi i standardów.

### Linting i Formatowanie

- **Narzędzie Główne Python:** [Ruff](https://beta.ruff.rs/docs/)
  Ruff jest używany do lintowania i formatowania kodu Python.
  Konfiguracja Ruff znajduje się w pliku `pyproject.toml` (dla Pythona).

### Sprawdzanie Typów

- **Python:** [Mypy](http://mypy-lang.org/)
  Mypy jest używane do statycznej analizy typów w kodzie Python.
  Konfiguracja Mypy znajduje się w pliku `pyproject.toml`.

### Pre-commit Hooks

Zalecamy użycie pre-commit hooks do automatycznego uruchamiania linterów i formatterów przed każdym commitem.

**Instalacja i Konfiguracja (jednorazowa):**

1.  Zainstaluj `pre-commit`:
    ```bash
    pip install pre-commit
    ```
2.  Zainstaluj hooki w swoim lokalnym repozytorium:
    `bash
    pre-commit install
    `
    Przykładowa konfiguracja (`.pre-commit-config.yaml`) zostanie dodana do projektu. Będzie ona zawierać hooki dla Ruff i Mypy.

## Konwencje Projektowe

### Branching (GitHub Flow)

Projekt stosuje strategię [GitHub Flow](https://docs.github.com/en/get-started/quickstart/github-flow):

1.  Branch `main` jest zawsze źródłem prawdy i powinien być stabilny.
2.  Nowe funkcje, poprawki, etc. są rozwijane na dedykowanych **feature branchach** tworzonych z `main`.
    - Sugerowane nazewnictwo: `typ/opis-zadania` (np. `feat/user-auth`, `fix/transcription-error`, `docs/update-readme`).
3.  Po ukończeniu prac, tworzony jest **Pull Request (PR)** z feature brancha do `main`.
4.  PR jest przeglądany (nawet w ramach samokontroli), testy CI muszą przejść.
5.  Po zatwierdzeniu, PR jest mergowany do `main`.
6.  Feature branch jest usuwany po zmergowaniu.

### Konwencja Nazewnictwa Commitów (Conventional Commits)

Wszystkie commity powinny być zgodne ze specyfikacją [Conventional Commits](https://www.conventionalcommits.org/).

Format: `type(scope): subject`

Przykładowe typy:

- `feat`: Nowa funkcjonalność.
- `fix`: Poprawka błędu.
- `docs`: Zmiany w dokumentacji.
- `style`: Zmiany formatowania, które nie wpływają na logikę (np. białe znaki, średniki).
- `refactor`: Zmiany w kodzie, które ani nie naprawiają błędu, ani nie dodają funkcjonalności.
- `perf`: Zmiany poprawiające wydajność.
- `test`: Dodawanie lub poprawianie testów.
- `build`: Zmiany wpływające na system budowania lub zależności zewnętrzne.
- `ci`: Zmiany w konfiguracji CI.
- `chore`: Inne zmiany, które nie modyfikują kodu źródłowego ani testów (np. aktualizacja narzędzi).

## Zgłaszanie Błędów i Propozycje

Wszelkie błędy, problemy lub propozycje nowych funkcjonalności prosimy zgłaszać poprzez [GitHub Issues](https://github.com/mplazax/meeting-syntesis/issues) w tym repozytorium.

## Licencja

(Do ustalenia - na razie projekt nie posiada formalnej licencji. Można tu później dodać np. MIT License.)
