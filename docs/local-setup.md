# Running Toolshop locally

The suite can run against three versions of the shop, chosen with `ENV`:

| ENV         | UI                                            | API                                               | When to use                                           |
| ----------- | --------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------- |
| `local`     | http://localhost:4200                         | http://localhost:8091                             | Default in CI. Own data, can be reset at any time.    |
| `public`    | https://practicesoftwaretesting.com           | https://api.practicesoftwaretesting.com           | Quick runs without Docker. Shared with other testers. |
| `with-bugs` | https://with-bugs.practicesoftwaretesting.com | https://api-with-bugs.practicesoftwaretesting.com | Defect hunting.                                       |

## Why test against a local copy

The public site is shared. Other people create brands, products and orders there all day, so
counts change and data appears that we did not create. A local copy starts from the same seed data
on every run and can be reset, which makes failures reproducible.

## Start the app with Docker

Requirements: Docker Desktop (or Docker Engine with Compose v2), about 2 GB free disk.

```bash
git clone https://github.com/testsmith-io/practice-software-testing.git
cd practice-software-testing

# Pre-built images, no local build needed
export SPRINT=sprint5            # or sprint5-with-bugs
export DISABLE_LOGGING=true
docker compose -f docker-compose.prod.yml up -d --pull missing

# Create the tables and load the seed data (takes ~20 s)
docker compose -f docker-compose.prod.yml exec -T laravel-api php artisan migrate:fresh --seed
```

Check that it is up:

```bash
curl http://localhost:8091/status      # {"version":"5.0",...}
open http://localhost:4200             # the shop
```

The first `up` downloads about 1.5 GB of images and takes a few minutes. After that it starts in seconds.

## Reset the data

Run the seed command again. It drops all tables and reloads the seed data:

```bash
docker compose -f docker-compose.prod.yml exec -T laravel-api php artisan migrate:fresh --seed
```

## Seeded accounts

From the Toolshop README. They are demo accounts, not secrets.

| Role     | E-mail                                | Password  |
| -------- | ------------------------------------- | --------- |
| admin    | admin@practicesoftwaretesting.com     | welcome01 |
| customer | customer@practicesoftwaretesting.com  | welcome01 |
| customer | customer2@practicesoftwaretesting.com | welcome01 |

Tests that place orders do **not** use these accounts. They register a fresh customer through the
API, so parallel runs and other testers cannot interfere.

## Run the tests against it

```bash
cp .env.example .env     # then set ENV=local
npm test
```

## Stop it

```bash
docker compose -f docker-compose.prod.yml down          # keep the data
docker compose -f docker-compose.prod.yml down -v       # remove the data too
```
