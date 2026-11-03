# syntax=docker/dockerfile:1
# image node générique, identique pour backend, gateway et microservices : seuls ENTRY et PORT changent

# étape 1 : dépendances de prod seulement
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# étape 2 : image minimale sous l'utilisateur node, sonde de santé pour l'orchestrateur
FROM node:24-alpine AS runner
ARG ENTRY=index.js
# sha du commit, renvoyé par /health : le pipeline vérifie que la bonne version tourne
ARG APP_COMMIT=dev
ENV NODE_ENV=production \
    PORT=4003 \
    ENTRY=${ENTRY} \
    APP_COMMIT=${APP_COMMIT}
WORKDIR /app
# correctifs alpine publiés après l'image de base (trivy bloque sur une faille critique corrigeable)
# npm et corepack ne servent pas à l'exécution : retirés, avec leurs dépendances vulnérables
RUN apk upgrade --no-cache \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
       /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

COPY --from=deps /app/node_modules ./node_modules
# .dockerignore écarte node_modules, .env, tests et outillage
COPY --chown=node:node . .

USER node
EXPOSE 4003

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:' + process.env.PORT + '/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# exec : node reçoit directement sigterm et peut s'arrêter proprement
CMD ["sh", "-c", "exec node \"$ENTRY\""]
