# Meeting Synthesis

Asystent do analizy i zarządzania wiedzą ze spotkań wykorzystujący narzędzia ML, z opcją przetwarzania lokalnego dla maksymalnej prywatności. Projekt ma na celu automatyzację tworzenia notatek, ekstrakcję kluczowych informacji oraz budowanie spójnej, przeszukiwalnej bazy wiedzy projektowej.

**Status Projektu:** Wczesna faza rozwoju. Funkcjonalności są aktywnie rozwijane.

## Spis Treści

- [Technologie](#technologie)
- [Struktura Projektu](#struktura-projektu)
- [Uruchomienie Środowiska Deweloperskiego](#uruchomienie-środowiska-deweloperskiego)
- [Wypełnianie Bazy Danych (Seeding)](#wypełnianie-bazy-danych-seeding)
- [Testowanie](#testowanie)
- [Narzędzia Deweloperskie i Standardy Kodu](#narzędzia-deweloperskie-i-standardy-kodu)
- [Konwencje Projektowe](#konwencje-projektowe)
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
- `mongo-init/`: Zawiera dane testowe (`.json`) i skrypt inicjalizujący bazę danych.
- `docker-compose.yml`: Definiuje i łączy wszystkie usługi aplikacji.
- `.env.example`: Szablon dla zmiennych środowiskowych całego projektu.
- `scripts/`: Skrypty pomocnicze.

## Uruchomienie Środowiska Deweloperskiego

### Wymagania Wstępne

Główną metodą uruchomienia jest Docker, co minimalizuje wymagania na maszynie hosta.

- [Git](https://git-scm.com/)
- [Docker](https://www.docker.com/get-started) i Docker Compose

### Konfiguracja i Start (Docker Compose)

Jest to **zalecana i główna metoda** uruchamiania całej aplikacji. Gwarantuje spójne środowisko dla wszystkich usług.

1.  **Sklonuj repozytorium:**

    ```bash
    git clone https://github.com/mplazax/meeting-syntesis.git
    cd meeting-syntesis
    ```

2.  **Skonfiguruj zmienne środowiskowe:**
    Projekt używa jednego pliku `.env` w głównym katalogu.

    ```bash
    cp .env.example .env
    ```

    Następnie otwórz plik `.env` i uzupełnij wymagane wartości.

3.  **Zbuduj i uruchom kontenery:**

    ```bash
    docker-compose up --build -d
    ```

    - `backend` API będzie dostępne pod `http://localhost:8000`
    - `frontend` będzie dostępny pod `http://localhost:3000`

4.  **Aby zatrzymać wszystkie usługi:**
    ```bash
    docker-compose down
    ```

### Rozwój Pojedynczego Serwisu (Tryb Hybrydowy)

Jeśli aktywnie pracujesz nad jedną częścią aplikacji (np. frontendem), możesz uruchomić większość usług w Dockerze, a jedną manualnie.

**Przykład: Praca nad frontendem z resztą usług w tle**

1.  Uruchom usługi zależne (backend, bazy danych) w Dockerze:
    ```bash
    docker-compose up -d backend mongo redis
    ```
2.  Zainstaluj zależności frontendu i uruchom serwer deweloperski Vite:
    ```bash
    cd frontend
    pnpm install
    pnpm dev
    ```
    Frontend będzie teraz działał na `http://localhost:5173` z HMR.

## Wypełnianie Bazy Danych (Seeding)

Projekt zawiera mechanizm automatycznego wypełniania bazy danych MongoDB danymi testowymi przy pierwszym uruchomieniu środowiska Docker.

### Jak to działa?

Skrypt `mongo-init/init-mongo.sh` jest automatycznie wykonywany przez kontener `mongo`, gdy ten startuje z pustym woluminem danych. Skrypt importuje dane z plików `.json` znajdujących się w tym samym katalogu.

### Testowanie i Ponowne Uruchomienie

Mechanizm seedingu działa **tylko raz**. Jeśli chcesz go uruchomić ponownie (np. aby przywrócić dane do stanu początkowego), musisz usunąć stary wolumin danych MongoDB.

1.  Zatrzymaj wszystkie kontenery i usuń woluminy (flaga `-v` jest kluczowa):
    ```bash
    docker-compose down -v
    ```
2.  Uruchom wszystko od nowa:
    ```bash
    docker-compose up --build -d
    ```

### Praca z Lokalną Bazą Danych (bez Dockera)

Jeśli pracujesz z instancją MongoDB zainstalowaną bezpośrednio na swoim systemie (bez Dockera), mechanizm automatycznego seedingu nie zadziała. Musisz zaimportować dane ręcznie, wykonując następujące komendy z głównego katalogu projektu:

```bash
mongoimport --db meeting_synthesis_db --collection users --file ./mongo-init/meeting_synthesis_db.users.json --jsonArray
mongoimport --db meeting_synthesis_db --collection projects --file ./mongo-init/meeting_synthesis_db.projects.json --jsonArray
mongoimport --db meeting_synthesis_db --collection meetings --file ./mongo-init/meeting_synthesis_db.meetings.json --jsonArray
```

## Testowanie

Zalecane jest uruchamianie testów wewnątrz kontenerów, aby zapewnić spójność środowiska.

- **Backend (pytest):**
  ```bash
  docker-compose exec backend pytest
  ```
- **Frontend (Vitest):**
  ```bash
  docker-compose exec frontend pnpm test
  ```

## Narzędzia Deweloperskie i Standardy Kodu

### Linting i Formatowanie

- **Python:** [Ruff](https://beta.ruff.rs/docs/)
- **Frontend:** Prettier + ESLint

### Sprawdzanie Typów

- **Python:** [Mypy](http://mypy-lang.org/)

### Pre-commit Hooks

Zalecamy użycie `pre-commit` do automatyzacji sprawdzania kodu przed każdym commitem.

## Konwencje Projektowe

### Branching (GitHub Flow)

Projekt stosuje strategię [GitHub Flow](https://docs.github.com/en/get-started/quickstart/github-flow). Prace są prowadzone na feature branchach, a następnie mergowane do `main` poprzez Pull Requesty.

### Konwencja Nazewnictwa Commitów (Conventional Commits)

Wszystkie commity powinny być zgodne ze specyfikacją [Conventional Commits](https://www.conventionalcommits.org/). Format: `type(scope): subject`.

## Zgłaszanie Błędów i Propozycje

Wszelkie błędy, problemy lub propozycje nowych funkcjonalności prosimy zgłaszać poprzez [GitHub Issues](https://github.com/mplazax/meeting-syntesis/issues).

## Licencja

(Do ustalenia)
