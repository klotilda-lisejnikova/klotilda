# Klotilda

The artist's website and e-shop ([klotilda.cz](https://klotilda.cz)) and its admin, on the
[Eleansphere core](https://github.com/Eleansphere/core).

- `packages/domain` — entities, DTOs, API clients
- `apps/api` — REST API (Railway)
- `apps/web` — website and shop, Next.js (Vercel)
- `apps/admin` — admin, Vue + Nuxt UI (Vercel)

```bash
# once: ~/.npmrc needs //npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
pnpm install
docker compose up -d
cp apps/api/.env.example apps/api/.env
cp apps/admin/.env.example apps/admin/.env.local
pnpm --filter @klotilda/api seed:admin   # SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD in apps/api/.env
pnpm dev
```

See `CLAUDE.md` for how it fits together.
