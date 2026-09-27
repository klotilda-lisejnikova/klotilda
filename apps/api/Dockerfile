# The API image. The build context is the repository root:
#   docker build -f apps/api/Dockerfile --build-arg NODE_AUTH_TOKEN .
# Railway hands service variables declared with ARG (here NODE_AUTH_TOKEN) to the build.

FROM node:24-bookworm-slim AS build
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /repo
COPY . .

# pnpm takes registry tokens only from the user-level config. That file holds a placeholder
# which pnpm fills in from this build arg: never name the token in a RUN line, BuildKit prints
# RUN lines with build args expanded. Nothing of it reaches the final stage.
ARG NODE_AUTH_TOKEN
COPY tooling/user.npmrc /root/.npmrc
RUN pnpm install --frozen-lockfile --filter @klotilda/api... \
  && pnpm --filter @klotilda/api build \
  && pnpm --filter @klotilda/api deploy --prod --legacy /app

FROM node:24-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app ./
USER node
CMD ["node", "dist/index.cjs"]
