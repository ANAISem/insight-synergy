FROM node:16-alpine as builder

WORKDIR /app

# Kopiere Package-Dateien und installiere Abhängigkeiten
COPY package*.json ./
RUN npm ci

# Kopiere den Rest des Quellcodes
COPY . .

# Baue das Projekt
RUN npm run build

# Zweite Phase: Runtime-Image
FROM node:16-alpine

WORKDIR /app

# Nur die für die Produktion notwendigen Abhängigkeiten installieren
COPY package*.json ./
RUN npm ci --only=production

# Kopiere die gebauten Dateien aus der Builder-Phase
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Stelle sicher, dass das Datenverzeichnis existiert
RUN mkdir -p /app/data
VOLUME /app/data

# Umgebungsvariablen für die Produktion
ENV NODE_ENV=production
ENV PORT=3000

# Port freigeben
EXPOSE 3000

# Gesundheitscheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1

# Container als unprivilegierter Benutzer ausführen
USER node

# Startet die Anwendung
CMD ["node", "dist/index.js"] 