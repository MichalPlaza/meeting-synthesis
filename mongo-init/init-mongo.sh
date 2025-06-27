#!/bin/bash

echo "🌱 Rozpoczynam import danych testowych z /docker-entrypoint-initdb.d/ ..."

# Czekaj na start serwera MongoDB
sleep 5

# Import kolekcji 'users'
# Pliki są teraz w tym samym katalogu co skrypt
mongoimport --db meeting_synthesis_db --collection users --file /docker-entrypoint-initdb.d/meeting_synthesis_db.users.json --jsonArray
echo "👤 Zaimportowano użytkowników."

# Import kolekcji 'projects'
mongoimport --db meeting_synthesis_db --collection projects --file /docker-entrypoint-initdb.d/meeting_synthesis_db.projects.json --jsonArray
echo "📁 Zaimportowano projekty."

# Import kolekcji 'meetings'
mongoimport --db meeting_synthesis_db --collection meetings --file /docker-entrypoint-initdb.d/meeting_synthesis_db.meetings.json --jsonArray
echo "🎤 Zaimportowano spotkania."

echo "✅ Import danych zakończony."