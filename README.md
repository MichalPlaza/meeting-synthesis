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

Poniżej przedstawiono kluczowe technologie użyte w projekcie wraz z krótkim uzasadnieniem wyboru:

### Backend

*   **Python 3.11+:** Wybrany ze względu na wszechstronność, dojrzałość ekosystemu ML (dla Whisper, Ollama) oraz dobrą obsługę operacji asynchronicznych.
*   **FastAPI:** Nowoczesny, szybki (oparty na Starlette i Pydantic) framework webowy do budowania API. Zapewnia automatyczną walidację danych, serializację i interaktywną dokumentację (Swagger UI/ReDoc), co przyspiesza rozwój.
*   **Poetry:** Narzędzie do zarządzania zależnościami i wirtualnymi środowiskami Pythona. Zapewnia deterministyczne i izolowane środowiska, co ułatwia zarządzanie projektem i jego reprodukowalność.
*   **MongoDB:** Elastyczna baza danych NoSQL, idealna do przechowywania różnorodnych i dynamicznych danych, takich jak transkrypcje, analizy AI oraz dokumenty użytkowników/projektów, gdzie schemat może ewoluować.
*   **Redis:** Używany jako broker komunikatów dla Celery oraz jako szybka pamięć podręczna. Kluczowy dla obsługi zadań w tle.
*   **Celery:** Rozproszony system kolejek zadań, który pozwala na wykonywanie długotrwałych operacji (np. transkrypcja audio, analiza AI) asynchronicznie, bez blokowania głównego API aplikacji.
*   **OpenAI Whisper:** State-of-the-art model do transkrypcji mowy na tekst. Wybrany ze względu na wysoką dokładność i wsparcie dla wielu języków.
*   **Ollama:** Umożliwia uruchamianie modeli językowych (LLM) lokalnie. Wykorzystywany do analizy AI spotkań, co oferuje większą prywatność i kontrolę nad danymi w porównaniu do usług chmurowych.
*   **Mutagen:** Biblioteka do odczytu i zapisu metadanych audio. Używana do automatycznego określania czasu trwania przesłanych plików dźwiękowych.

### Frontend

*   **TypeScript:** Statycznie typowany język programowania, który kompiluje się do JavaScriptu. Zapewnia lepszą jakość kodu, wykrywanie błędów na etapie developmentu i ułatwia refaktoryzację dużych projektów.
*   **React:** Popularna biblioteka JavaScript do budowania interfejsów użytkownika opartych na komponentach. Umożliwia efektywne tworzenie dynamicznych i interaktywnych aplikacji.
*   **Vite:** Szybki i nowoczesny narzędzie do budowania frontendów. Oferuje błyskawiczne odświeżanie na żywo (HMR) i zoptymalizowany bundling, co znacznie przyspiesza cykl deweloperski.
*   **PNPM:** Efektywny menedżer pakietów JavaScript. Oszczędza miejsce na dysku i przyspiesza instalację zależności dzięki współdzielonej pamięci podręcznej.
*   **Tailwind CSS:** Framework CSS oparty na klasach narzędziowych. Pozwala na szybkie i elastyczne stylowanie bez konieczności pisania własnego CSS, promując spójność wizualną.
*   **shadcn/ui:** Kolekcja reużywalnych komponentów UI zbudowanych na Radix UI i Tailwind CSS. Zapewnia piękne, gotowe do użycia, ale jednocześnie w pełni konfigurowalne i dostępne komponenty.
*   **Radix UI:** Zestaw niskopoziomowych, bezstylowych komponentów dla Reacta. Skupia się na dostępności (WCAG) i funkcjonalności, stanowiąc fundament dla komponentów shadcn/ui.
*   **React Router DOM:** Standardowa biblioteka do zarządzania routingiem w aplikacjach React SPA (Single Page Application), zapewniająca płynne przejścia między widokami.
*   **React Hook Form & Zod:** Połączenie do efektywnego zarządzania formularzami i ich walidacji. `React Hook Form` minimalizuje rerendery i upraszcza logikę formularzy, a `Zod` zapewnia potężne i bezpieczne schematy walidacji typu-first.
*   **Sonner:** Nowoczesna biblioteka do tworzenia pięknych i konfigurowalnych powiadomień typu "toast".
*   **Lucide React:** Lekki i spójny zestaw ikon do wykorzystania w interfejsie użytkownika.
*   **date-fns:** Lekka biblioteka do operacji na datach, oferująca szeroki zakres funkcji formatowania i manipulacji.
*   **clsx & tailwind-merge:** Narzędzia pomagające w dynamicznym konstruowaniu i łączeniu klas Tailwind CSS, eliminując konflikty.
*   **cmdk:** Komponent do budowania palet komend i zaawansowanych selektorów, wykorzystany do stworzenia ulepszonego multi-selecta dla wyboru członków projektu.
*   **react-dropzone:** Hook do łatwego implementowania funkcji przeciągnij-i-upuść dla przesyłania plików.

### Konteneryzacja

*   **Docker & Docker Compose:** Służą do konteneryzacji całej aplikacji. Zapewniają spójne środowiska deweloperskie i produkcyjne, izolują usługi od siebie i znacznie upraszczają proces wdrażania, eliminując problemy "u mnie działa".

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
