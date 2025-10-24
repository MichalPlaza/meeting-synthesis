# backend/Dockerfile

# --- Etap 1: Baza z Pythonem i Poetry ---
FROM python:3.11-slim as base
ENV POETRY_HOME="/opt/poetry"
ENV PATH="$POETRY_HOME/bin:$PATH"
RUN apt-get update && apt-get install -y --no-install-recommends curl libopenblas-dev libgfortran5 libgomp1 && rm -rf /var/lib/apt/lists/*
RUN pip install numpy==1.26.3 torch==2.2.0 --index-url https://download.pytorch.org/whl/cpu
RUN pip install ctranslate2==3.24 onnxruntime==1.18.0
RUN curl -sSL https://install.python-poetry.org | python3 -
WORKDIR /app
COPY pyproject.toml poetry.lock ./
RUN poetry config virtualenvs.create false

# --- Etap 2: Zależności produkcyjne ---
FROM base as production-dependencies
RUN poetry install --no-root --no-interaction --no-ansi --only main
RUN pip install openai-whisper

# --- Etap 3: Zależności deweloperskie (dla testów) ---
FROM base as dev-dependencies
# Instalujemy WSZYSTKIE zależności, w tym deweloperskie
RUN poetry install --no-root --no-interaction --no-ansi

# --- Etap 4: Finalny obraz produkcyjny ---
FROM python:3.11-slim as final
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHON_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# Kopiujemy tylko zależności produkcyjne
COPY --from=production-dependencies /usr/local/ /usr/local/
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]