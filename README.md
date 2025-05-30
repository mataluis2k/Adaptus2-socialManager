# Adaptus2 Social Manager

A simple React + TypeScript dashboard for composing and scheduling social media posts. It uses Supabase for data storage and authentication.

## Getting Started

1. Copy `.env.example` to `.env` and fill in the values for your environment.
2. Install dependencies with `npm install`.
3. Run development server with `npm run dev`.

## Environment Variables

| Variable | Description |
| -------- | ----------- |
| `VITE_API_URL` | Base URL of the backend API. |
| `VITE_SUPABASE_URL` | Supabase project URL. |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key. |
| `PORT` | (Optional) Port used by Express if you implement a server. |
| `JWT_SECRET` | Secret used for signing JWTs if using the sample API. |

Do not commit your real credentials to version control. Use deployment secrets instead.

## Database Setup

Supabase migrations are stored in the `supabase/migrations` directory. Apply them to your project with the Supabase CLI:

```bash
supabase db push
```

## Scripts

- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm test` - Run unit tests with Vitest

## Testing & Linting

Linting and unit tests require the dev dependencies defined in `package.json`. Ensure you run `npm install` before executing `npm run lint` or `npm test`.

## Docker

Build and run the application with Docker:

```bash
docker build -t adaptus2-social-manager .
docker run --rm -p 80:80 adaptus2-social-manager
```

## CI/CD

This repository uses GitHub Actions to automatically lint, test, and build on push and pull requests.

See `.github/workflows/ci.yml` for details.


