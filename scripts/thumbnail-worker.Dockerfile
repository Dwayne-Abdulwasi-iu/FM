FROM node:20-bullseye

# Install ffmpeg
RUN apt-get update && apt-get install -y ffmpeg ca-certificates --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install production deps to avoid re-downloading dev deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --no-audit --no-fund

# Copy the project (we'll also mount the repo at runtime so changes reflect)
COPY . .

CMD ["node", "-r", "dotenv/config", "scripts/thumbnail-worker.mjs", "dotenv_config_path=.env.local"]
