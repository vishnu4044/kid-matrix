FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

# Shell form (not exec-form JSON array) so $PORT actually expands — Railway
# and most other PaaS platforms assign a dynamic port via this env var and
# route traffic to it; a hardcoded port would never receive requests there.
# Falls back to 5000 for plain `docker run`/docker-compose where PORT isn't set.
CMD gunicorn --bind 0.0.0.0:${PORT:-5000} --workers 2 wsgi:app
