import os

from celery import Celery
from dotenv import load_dotenv

# Załaduj zmienne środowiskowe z pliku .env
# To jest ważne, aby Celery wiedziało, gdzie jest Redis
load_dotenv()

# Pobierz URL brokera z zmiennych środowiskowych
# Domyślna wartość jest na wypadek, gdyby zmienna nie była ustawiona
celery_broker_url = os.getenv("CELERY_BROKER_URL", "redis://redis:6379/0")
celery_result_backend = os.getenv("CELERY_RESULT_BACKEND", "redis://redis:6379/0")

# Stwórz instancję aplikacji Celery
# Pierwszy argument to nazwa głównego modułu, tutaj 'app.worker'
# 'broker' i 'backend' wskazują na Redis zgodnie ze zmiennymi środowiskowymi
celery_app = Celery(
    "worker",
    broker=celery_broker_url,
    backend=celery_result_backend,
    include=["app.worker.tasks"],  # Lista modułów z zadaniami do zaimportowania
)

# Opcjonalna konfiguracja
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

# To jest kluczowe, aby Celery automatycznie odkrywało zadania
# z plików zdefiniowanych w 'include'
celery_app.autodiscover_tasks()
