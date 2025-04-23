# Meeting Synthesis - Wizja Produktu

## Opis dziedziny problemu

Spotkania biznesowe i projektowe są kluczowym elementem komunikacji, podejmowania decyzji i zarządzania projektami. Generują one jednak duże ilości informacji, często w formie nieustrukturyzowanej, co prowadzi do szeregu wyzwań:

*   **Nieefektywne notowanie i dokumentacja:** Ręczne notowanie jest czasochłonne, podatne na błędy i subiektywne. Prowadzi to do pomijania ważnych informacji, niespójności między notatkami różnych uczestników i trudności w późniejszym wyszukiwaniu kluczowych ustaleń.
*   **Trudności w analizie treści:** Przetworzenie dużej ilości informacji omawianych podczas spotkania jest trudne. Kluczowe decyzje, zadania i wnioski mogą zostać zagubione w natłoku mniej istotnych dyskusji, co utrudnia ich późniejsze wykorzystanie i wdrożenie.
*   **Fragmentacja Wiedzy:** Informacje z kolejnych spotkań często istnieją w izolacji (w oddzielnych notatkach, plikach). Utrudnia to śledzenie ewolucji decyzji, zadań i problemów w czasie oraz zrozumienie kontekstu historycznego projektu bez przeglądania wielu dokumentów.
*   **Problemy z zarządzaniem zadaniami:** Ustalenia i przydzielone zadania bywają niejednoznaczne lub nie są systematycznie śledzone. Brak automatyzacji w identyfikacji i eksporcie zadań wymaga dodatkowej pracy manualnej i zwiększa ryzyko ich pominięcia.

Dziedzina problemowa obejmuje wyzwania związane z efektywnym przechwytywaniem, analizą, organizacją i wykorzystaniem wiedzy generowanej podczas spotkań. Rozwiązanie tego problemu wymaga narzędzia, które nie tylko automatyzuje proces tworzenia notatek, ale także pomoże w budowaniu spójnej bazy wiedzy projektowej, wspierając podejmowanie decyzji i zarządzanie zadaniami w dłuższej perspektywie.

## Szkic działania systemu / Proponowane rozwiązanie

### Przypadek Użycia: Przetwarzanie Spotkania Statusowego Zespołu w Meeting Synthesis

#### Cel Przypadku Użycia:
Demonstracja przepływu pracy w systemie Meeting Synthesis, od załadowania nagrania spotkania, przez automatyczną analizę i ekstrakcję informacji, po interakcję użytkownika z wynikami i integrację z zewnętrznym narzędziem (JIRA).

#### Opis Scenariusza:
Scrum Master (Anna) używa aplikacji Meeting Synthesis do przetworzenia nagrania cotygodniowego spotkania zespołu "Alpha". Celem jest uzyskanie transkrypcji, automatycznego podsumowania, listy zadań (Action Items) i decyzji. Następnie Anna weryfikuje wyniki, dodaje własne notatki, tworzy powiązanie z informacjami z poprzedniego spotkania i eksportuje zadania do systemu JIRA używanego przez zespół.

#### Uczestnicy i Systemy:
*   **Użytkownik Główny:** Anna (Scrum Master)
*   **Pozostali Uczestnicy:** Członkowie zespołu "Alpha" (Piotr, Kasia, Marek) – jako źródło danych (mówcy) i odbiorcy wyników.
*   **Systemy:**
    *   Meeting Synthesis (nasza aplikacja)
    *   JIRA (zewnętrzny system do zarządzania zadaniami)

#### Warunki Początkowe:
*   Odbyło się spotkanie zespołu "Alpha", które zostało nagrane (plik `spotkanie_alpha_2025-05-22.m4a`).
*   Anna ma dostęp do aplikacji Meeting Synthesis.
*   Aplikacja ma skonfigurowane połączenie z JIRA (opcjonalnie).
*   W systemie istnieje już kategoria/projekt "Projekt Alpha" z historią poprzednich spotkań.

#### Podstawowy Przepływ Zdarzeń:
1.  **Logowanie i Wgranie Pliku:**
    *   Anna loguje się do Meeting Synthesis.
    *   Wgrywa plik `spotkanie_alpha_2025-05-22.m4a` przez interfejs aplikacji.
2.  **Konfiguracja Przetwarzania:**
    *   Anna podaje tytuł spotkania ("Status Projektu MPS v2 - Tydzień 21") i przypisuje je do "Projektu Alpha".
    *   Wybiera język nagrania ("Polski").
    *   (Opcjonalnie) Może dodać listę uczestników, aby potencjalnie wspomóc identyfikację mówców.
    *   Aplikacja sprawdza specyfikację komputera Anny i sugeruje tryb przetwarzania (lokalny lub chmurowy) wraz z szacowanym czasem. Anna decyduje się na przetwarzanie w chmurze.
    *   Anna inicjuje przetwarzanie.
3.  **Automatyczna Analiza przez System:**
    *   System rozpoczyna przetwarzanie wieloetapowe nagrania:
        *   **Transkrypcja:** Mowa jest zamieniana na tekst (np. przy użyciu modelu Whisper).
        *   **Identyfikacja mówców:** Identyfikowane są osoby mówiące w poszczególnych fragmentach transkrypcji (np. przez pyannote-audio).
        *   **Analiza Treści (LLM):** Transkrypcja jest analizowana przez model językowy w celu wyodrębnienia:
            *   Podsumowania kluczowych punktów.
            *   Głównych tematów dyskusji.
            *   Listy zadań (Action Items) – z próbą identyfikacji osoby odpowiedzialnej i terminu.
            *   Podjętych decyzji.
            *   Wspomnianych dat.
4.  **Zapis Wyników:** Przetworzone dane (transkrypcja, podsumowanie, metadane) są zapisywane w bazie danych i powiązane z odpowiednim spotkaniem/projektem.
5.  **Prezentacja Wyników Użytkownikowi:**
    *   Po zakończeniu przetwarzania, Anna otrzymuje powiadomienie.
    *   W interfejsie aplikacji, w widoku przetworzonego spotkania, Anna widzi:
        *   Odtwarzacz audio zsynchronizowany z tekstem.
        *   Pełną transkrypcję z oznaczonymi mówcami.
        *   Sekcję "Podsumowanie AI".
        *   Listę wykrytych "Tematów".
        *   Listę "Action Items".
        *   Listę "Decyzji".
        *   Wykazane "Daty".
6.  **Weryfikacja i Interakcja Użytkownika:**
    *   Anna przegląda wygenerowane sekcje, sprawdzając ich poprawność.
    *   Edytuje jedno z zadań (Action Item), dodając komentarz dla Piotra.
    *   Zauważa powtarzający się temat [Obsługa Błędów]. Używa funkcji linkowania, aby połączyć ten temat z analogicznym punktem w notatce ze spotkania sprzed trzech tygodni (znalezionym w ramach "Projektu Alpha"), dodając opis powiązania "Powracający problem".
    *   Do jednej z decyzji dodaje wizualną notatkę (tzw. sticky note) z własnym komentarzem.
7.  **Eksport Zadań do JIRA:**
    *   Anna zaznacza w interfejsie zadania przeznaczone dla Piotra i Kasi.
    *   Uruchamia funkcję eksportu do JIRA.
    *   W oknie dialogowym potwierdza mapowanie użytkowników i projektu docelowego w JIRA.
    *   Zatwierdza eksport.
8.  **Finalizacja i Dostęp do Wyników:**
    *   System potwierdza pomyślne utworzenie zadań w JIRA.
    *   Anna (lub członkowie zespołu) może zweryfikować obecność zadań w JIRA, które zawierają link zwrotny do notatki w Meeting Synthesis.
    *   Cały zespół ma dostęp do przetworzonej notatki w Meeting Synthesis, co ułatwia powrót do ustaleń i kontekstu.

#### Rezultat (Postkondycje):
*   Nagranie spotkania jest przetworzone i dostępne w systemie Meeting Synthesis jako ustrukturyzowana notatka.
*   Wygenerowano automatyczne podsumowanie, listę zadań, decyzji i tematów.
*   Notatka została wzbogacona o komentarze i powiązania kontekstowe dodane przez użytkownika.
*   Zadania zostały skutecznie przeniesione do systemu JIRA.
*   Wiedza ze spotkania jest scentralizowana i łatwiej dostępna dla zespołu, co wspiera ciągłość pracy projektowej.

#### Diagramy:

**Interakcja użytkownik-system:**
(Placeholder na diagram interakcji)

**Data Flow Diagram:**
(Placeholder na diagram przepływu danych)

#### Wyjaśnienie Data Flow:
*   **Wejście dane:** Użytkownik dostarcza nagranie audio ze spotkania lub potencjalnie wkleja gotową transkrypcję.
*   **Przetwarzanie mowy na tekst:** Automatycznie przekształca mowę na tekst, tworząc transkrypcję, identyfikuje mówców, przypisując wypowiedzi do odpowiednich uczestników spotkania.
*   **Przetwarzanie AI:** Oczyszczanie transkryptu z błędów, a następnie przekazanie go do analizy; analiza językowa obejmuje: podsumowanie spotkania, rozpoznawanie tematów, emocji, trendów oraz przypisywanie zadań, etc.
*   **Aktualizacja bazy danych:** Zapisuje przetworzone dane.
*   **Zwracanie wyników:** Dane są wyświetlane użytkownikowi na stronie internetowej (frontend).

## Rola produktu i użytkownicy końcowi

Meeting Synthesis ma być inteligentnym asystentem zarządzania wiedzą ze spotkań, który nie tylko automatyzuje proces tworzenia notatek, ale przede wszystkim buduje spójną bazę wiedzy, umożliwiając łączenie informacji w czasie i efektywne wykorzystanie ustaleń. Produkt przekształca dane ze spotkań (audio/tekst) w ustrukturyzowaną, przeszukiwalną i interaktywną wiedzę.

### Kluczowe cele:
*   **Automatyzacja i standaryzacja:** Automatyczne tworzenie transkrypcji i inteligentnych podsumowań.
*   **Centralizacja wiedzy:** Gromadzenie wszystkich informacji ze spotkań w jednym, łatwo dostępnym miejscu.
*   **Wydobywanie kluczowych informacji:** Identyfikacja tematów, decyzji, zadań (action items), dat, osób odpowiedzialnych.
*   **Budowanie ciągłości:** Umożliwienie wizualnego i logicznego łączenia informacji pomiędzy notatkami z różnych spotkań w ramach projektu/tematu.
*   **Wsparcie w zarządzaniu zadaniami:** Ułatwienie eksportu zidentyfikowanych zadań do zewnętrznych systemów (np. JIRA).
*   **Interaktywność i personalizacja:** Możliwość dodawania własnych adnotacji, komentarzy, "wirtualnych karteczek" (sticky notes) do wygenerowanych podsumowań.

### Użytkownicy końcowi:
*   **Scrum Masterzy:** Śledzenie postępów, identyfikacja blokerów, przygotowanie do kolejnych sprintów.
*   **Project Managerowie:** Monitorowanie decyzji, zadań, terminów, zapewnienie ciągłości projektu.
*   **Product Ownerzy:** Śledzenie wymagań, decyzji produktowych, feedbacku.
*   **Członkowie zespołów projektowych:** Szybki dostęp do ustaleń, zadań, kontekstu dyskusji.
*   **Analitycy biznesowi, badacze UX:** Analiza wywiadów, spotkań z klientami.

## Współpracujące systemy

*   **Whisper** - narzędzie do transkrypcji
*   **Jira** i inne podobne - wsparcie do importu zadań
*   **LLM** - analiza

## Wymagania funkcjonalne i niefunkcjonalne

### Funkcjonalne:
*   **Przetwarzanie wejścia:** Obsługa plików audio. Możliwość wklejenia/wpisania tekstu.
*   **Transkrypcja:** Zamiana mowy na tekst z identyfikacją mówców.
*   **Analiza treści (LLM):**
    *   Generowanie zwięzłych podsumowań.
    *   Identyfikacja kluczowych tematów/fraz kluczowych.
    *   Ekstrakcja zadań z przypisaniem osób i terminów.
    *   Wykrywanie dat i relacji czasowych ("za tydzień", "do końca miesiąca").
    *   Identyfikacja pytań/niejasności.
*   **Zarządzanie wiedzą:**
    *   Przechowywanie notatek/podsumowań w centralnej bazie.
    *   Możliwość przeglądania historii spotkań w ramach projektu/tematu (widok osi czasu).
    *   Wizualne łączenie powiązanych informacji między różnymi notatkami.
    *   Możliwość dodawania adnotacji, komentarzy, tagów, sticky notes do podsumowań.
*   **Eksport:** Generowanie listy zadań w formacie kompatybilnym z importem do JIRA. Eksport notatek.

### Niefunkcjonalne:
*   **Wydajność:** Akceptowalny czas przetwarzania nagrań. Responsywny interfejs użytkownika.
*   **Skalowalność:** Architektura umożliwiająca obsługę rosnącej liczby użytkowników i danych (ważne przy opcji chmurowej).
*   **Bezpieczeństwo i Prywatność:**
    *   **Opcja Local-First:** Możliwość uruchomienia kluczowych komponentów (przetwarzanie AI) lokalnie dla maksymalnej prywatności. Szyfrowanie danych przechowywanych lokalnie.
    *   **Opcja Chmurowa:** Bezpieczne przetwarzanie i przechowywanie danych w chmurze. Zapewnienie bezpiecznej transmisji danych.
*   **Elastyczność hostingu:**
    *   Automatyczne wykrywanie specyfikacji sprzętowej użytkownika.
    *   Sugerowanie optymalnego trybu pracy (lokalny vs chmura) na podstawie minimalnych wymagań sprzętowych dla trybu lokalnego.
    *   Szacowanie czasu przetwarzania w zależności od wybranego trybu i długości nagrania.
*   **Użyteczność:** Intuicyjny i przyjazny interfejs użytkownika (UI/UX), szczególnie dla funkcji wizualizacji i łączenia wiedzy.
*   **Niezawodność:** Stabilne działanie, mechanizmy obsługi błędów (np. przy transkrypcji, analizie).
*   **Utrzymanie i Rozwój:** Modularna architektura, czytelny kod, dobra dokumentacja.

## Przegląd konkurencyjnych rozwiązań

*   **Otter.ai, Fireflies.ai, Sembly AI, Zoom AI Companion:** Główne funkcje to transkrypcja i podsumowania z pojedynczych spotkań, zazwyczaj w chmurze. Ograniczone możliwości łączenia wiedzy między spotkaniami w interaktywny sposób.
*   **ClickUp:** Kompleksowe narzędzie PM, integruje notatki, ale nie skupia się na inteligentnej analizie audio/wideo i budowaniu ciągłości wiedzy ze spotkań w proponowany sposób.
*   **NotebookLM (Google):** Ogólne narzędzie do pracy z dokumentami (tekst, audio), umożliwia zadawanie pytań i notowanie. Mniej wyspecjalizowane w kontekście spotkań i ekstrakcji konkretnych elementów (zadania, decyzje).
*   **Obsidian + Plugins:** Potężne narzędzie do budowania baz wiedzy, ale wymaga manualnej integracji wielu komponentów (transkrypcja, LLM) i ręcznego tworzenia powiązań.

### Uzasadnienie biznesowe Meeting Synthesis:
*   Integracja inteligentnej analizy z budowaniem ciągłości wiedzy: Tworzenie interaktywnej, połączonej bazy wiedzy projektowej.
*   Unikalne funkcje wizualizacji i interakcji: Graficzne łączenie ustaleń, adnotacje (sticky notes).
*   Opcja Local-First: Odpowiedź na potrzeby prywatności danych.
*   Skupienie na potrzebach zespołów projektowych: Integracja z JIRA, ekstrakcja zadań/decyzji.
*   (Potencjalnie) Darmowa/Open-Source alternatywa dla płatnych funkcji konkurencji.

## Analiza technologiczna

*   **Interfejs Użytkownika (Frontend):** Web UI (React/Vue/Svelte), biblioteki komponentów, biblioteki do wizualizacji (np. React Flow).
*   **Backend (API):** FastAPI (Python) - wydajność, asynchroniczność, łatwość integracji z AI.
*   **Bazy danych:** MongoDB - Bardzo odpowiedni, ponieważ dane mogą być niestrukturalne, świetny wybór do przechowywania dużych tekstów takich jak transkrypcja.
*   **Przetwarzanie Dźwięku:**
    *   Transkrypcja: Whisper (OpenAI)
    *   Identyfikacja mówców: pyannote-audio
*   **Przetwarzanie Języka (NLP / AI):**
    *   **Opcja Lokalna:** Modele (Llama, Mistral - skwantyzowane) przez llama.cpp, Transformers (Hugging Face).
    *   **Opcja Chmurowa:** API (OpenAI (lub inne), Anthropic, Google).
    *   **Frameworki:** LangChain / LlamaIndex.
    *   **Techniki:** Prompt engineering, (potencjalnie fine-tuning).
    *   **NLU Emulation:** Wykorzystanie LLM do identyfikacji encji, tematów, zadań, sentymentu przez odpowiednie promptowanie.
*   **Konteneryzacja i Wdrożenie:** Docker.
*   **Narzędzia Wspomagające:** Git, Figma, Discord.

## Analiza ryzyka

| Ryzyko                                        | Prawdopodobieństwo | Wpływ   | Działania zapobiegające                                                                                         |
| :-------------------------------------------- | :----------------- | :------ | :-------------------------------------------------------------------------------------------------------------- |
| Błędy w transkrypcji                          | Średnie            | Średni  | Użycie Whisper, informowanie o jakości audio, możliwość edycji transkrypcji.                                    |
| Niedokładna analiza LLM                       | Niskie             | Wysoki  | Dobór modelu, prompt engineering, możliwość edycji wyników przez użytkownika, testowanie.                       |
| Problemy z wydajnością przetwarzania lokalnego | Średnie            | Wysoki  | Opcja chmurowa, modele skwantyzowane, komunikacja wymagań, szacowanie czasu, optymalizacja, przetwarzanie w tle. |
| Złożoność implementacji UI (wizualizacje)     | Niskie             | Niski   | Wykorzystanie bibliotek UI (React Flow), iteracyjne podejście, testy użyteczności.                              |
| Problemy ze skalowalnością                    | Niskie             | Średni  | Modularna architektura, skalowalna baza danych, optymalizacja zapytań, Docker.                                  |
| Bezpieczeństwo danych (local-first)           | Średnie            | Wysokie | Szyfrowanie lokalne, brak wysyłania danych w trybie local, zabezpieczenie API.                                  |
| Prywatność danych i zgodność z RODO (chmura)  | Średnie            | Wysokie | Zgodność z RODO, anonimizacja/pseudonimizacja, polityka prywatności, zarządzanie zgodami, prawo do usunięcia. |
| Trudności w uzyskaniu danych testowych        | Niskie             | Średni  | Własne nagrania, dane syntetyczne, (ew. publiczne zbiory), testy z innymi zespołami (za zgodą).                 |

## Słownik pojęć

*   **Transkrypcja:** Proces zamiany mowy na tekst przy użyciu technologii Speech-To-Text, np. Whisper lub Google STT.
*   **Segment spotkania:** Wydzielona część spotkania zawierająca spójną wypowiedź, myśl lub temat – może być automatycznie wykrywana przez system.
*   **Highlight:** Kluczowy fragment rozmowy oznaczony jako istotny, np. decyzja, problem, zadanie – może być wykrywany automatycznie przez model LLM.
*   **Tag:** Słowo kluczowe przypisane do highlighta lub segmentu, np. „ACTION”, „ISSUE”, „DECISION”, które grupuje i klasyfikuje treści.
*   **LLM (Large Language Model):** Duży model językowy (np. GPT), wykorzystywany do analizy kontekstu wypowiedzi i generowania streszczeń, tagów i odpowiedzi.
*   **Analiza semantyczna:** Proces rozumienia znaczenia tekstu na poziomie kontekstu, relacji i intencji – używana do wykrywania kluczowych treści w wypowiedziach.
*   **Podsumowanie kontekstowe:** Zwięzłe streszczenie fragmentu lub całości spotkania generowane przez model językowy na podstawie semantyki wypowiedzi.
*   **Local-first:** Podejście do projektowania systemu, w którym wszystkie dane i operacje odbywają się lokalnie na urządzeniu użytkownika, z opcjonalną synchronizacją.
