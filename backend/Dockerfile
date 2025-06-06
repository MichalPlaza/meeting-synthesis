# backend/Dockerfile

# Etap 1: Instalacja Poetry i zależności
FROM python:3.11-slim as builder

# Instalacja zależności systemowych
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Instalacja Poetry
ENV POETRY_HOME="/opt/poetry"
ENV POETRY_VERSION=1.8.3
ENV PATH="$POETRY_HOME/bin:$PATH"
RUN curl -sSL https://install.python-poetry.org | python3 - \
    && chmod +x $POETRY_HOME/bin/poetry

# Ustawienie katalogu roboczego
WORKDIR /app

# Kopiowanie plików zależności
COPY pyproject.toml poetry.lock ./

# Instalacja zależności
RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi --no-root --without dev

# Etap 2: Ostateczny obraz
FROM python:3.11-slim

# Instalacja zależności systemowych
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Kopiowanie zainstalowanych zależności z etapu budowania
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Ustawienie katalogu roboczego i zmiennych środowiskowych
WORKDIR /app
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app

# Kopiowanie kodu aplikacji
COPY . .

# Udostępnienie portu
EXPOSE 8000

# Uruchomienie aplikacji
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
