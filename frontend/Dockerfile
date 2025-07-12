# --- Etap 1: Budowanie aplikacji ---
FROM node:20-alpine AS build

# Ustaw argument budowania, który będzie przekazany z docker-compose.yml
ARG VITE_BACKEND_API_BASE_URL

# Ustaw zmienną środowiskową, aby była dostępna dla procesu budowania Vite
ENV VITE_BACKEND_API_BASE_URL=${VITE_BACKEND_API_BASE_URL}

WORKDIR /app

# Kopiuj pliki manifestu i pnpm lock
COPY package.json pnpm-lock.yaml ./

# Zainstaluj pnpm i zależności
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile

# Kopiuj resztę kodu źródłowego
COPY . .

# Zbuduj aplikację dla środowiska produkcyjnego
RUN pnpm run build

# --- Etap 2: Serwowanie aplikacji przez Nginx ---
FROM nginx:alpine

# Kopiuj zbudowane pliki statyczne z etapu "build" do katalogu serwera Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Kopiuj niestandardową konfigurację Nginx, aby obsługiwać Single Page Application
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Odsłoń port 80, na którym Nginx nasłuchuje w kontenerze
EXPOSE 80

# Uruchom Nginx
CMD ["nginx", "-g", "daemon off;"]