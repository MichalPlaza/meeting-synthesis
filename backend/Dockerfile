# Ścieżka pliku: ./backend/Dockerfile

# --- Etap 1: Builder - instalacja zależności ---
    FROM python:3.11-slim as builder

    # Instalacja Poetry
    RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
        && rm -rf /var/lib/apt/lists/*
    ENV POETRY_HOME=/opt/poetry
    ENV PATH="$POETRY_HOME/bin:$PATH"
    RUN curl -sSL https://install.python-poetry.org | python3 - \
        && chmod +x /opt/poetry/bin/poetry
    
    # Ustawienie katalogu roboczego i skopiowanie plików zależności
    WORKDIR /app
    COPY pyproject.toml poetry.lock ./
    
    # Instalacja zależności
    RUN poetry config virtualenvs.create false \
        && poetry install --no-interaction --no-ansi --no-root --without dev
    
    # --- Etap 2: Finalny obraz ---
    FROM python:3.11-slim
    
    # Instalacja zależności systemowych (np. dla numpy)
    RUN apt-get update && apt-get install -y --no-install-recommends \
        libgomp1 \
        && rm -rf /var/lib/apt/lists/*
    
    # Ustawienie zmiennych środowiskowych z poprawną składnią
    ENV PYTHONDONTWRITEBYTECODE=1
    ENV PYTHONUNBUFFERED=1
    
    # Ustawienie katalogu roboczego
    WORKDIR /app
    
    # Kopiowanie zainstalowanych zależności z etapu buildera
    COPY --from=builder /usr/local/ /usr/local/
    
    # Kopiowanie kodu aplikacji
    COPY . .
    
    # Wystawienie portu
    EXPOSE 8000
    
    # Domyślna komenda startowa dla produkcji (zostanie nadpisana w trybie dev)
    CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]