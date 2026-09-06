# --- Frontend bauen -----------------------------------------------------
FROM node:22-alpine AS web
WORKDIR /build
COPY web/package.json web/package-lock.json* ./
RUN npm install
COPY web/ ./
RUN npm run build

# --- API + gebautes Frontend -------------------------------------------
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    STATIC_DIR=/srv/static \
    DATABASE_URL=sqlite:////data/homestead.db

WORKDIR /srv

COPY api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY api/app ./app
COPY --from=web /build/dist ./static

RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
