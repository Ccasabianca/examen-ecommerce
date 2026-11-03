# syntax=docker/dockerfile:1
# images de base tirées du miroir officiel aws (public.ecr.aws) : pas de limite de téléchargement anonyme comme sur docker hub en ci

# étape 1 : build, l'url de l'api est fixée à la build (/api = même origine via nginx)
# marche pour vite (dist/) comme pour create react app (build/)
FROM public.ecr.aws/docker/library/node:24-alpine AS build
WORKDIR /app
ARG API_URL=/api
ENV VITE_API_URL=$API_URL \
    REACT_APP_API_URL=$API_URL
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build && mkdir -p /out && cp -r "$( [ -d dist ] && echo dist || echo build )"/. /out/

# étape 2 : nginx sert la spa et relaie /api vers le backend
FROM public.ecr.aws/nginx/nginx:stable-alpine AS runner
# correctifs alpine publiés après l'image de base (trivy bloque sur une faille critique corrigeable)
RUN apk upgrade --no-cache
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /out /usr/share/nginx/html
EXPOSE 80
# 127.0.0.1 et non localhost : dans alpine localhost vise ipv6, nginx écoute en ipv4
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz > /dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]
