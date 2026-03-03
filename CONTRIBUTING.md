# Contributing to Photobox

Thanks for your interest in contributing!

## Getting Set Up

```bash
git clone https://github.com/noisedeck/photobox.git
cd photobox
npm install
npm run dev
```

Open http://localhost:3005 and grant camera access.

## Running Tests

```bash
npx playwright install  # first time only
npm test
```

## Submitting Changes

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Run `npm test` and make sure tests pass
4. Open a pull request with a clear description of what you changed and why

## Code Style

- Vanilla JavaScript — no frameworks, no transpilers
- ES modules (`import`/`export`)
- No build step — files in `public/` are served directly
- Keep it simple. If a feature needs a library, let's discuss it in an issue first.

## Reporting Issues

Open an issue on [GitHub](https://github.com/noisedeck/photobox/issues). Include your browser, OS, and steps to reproduce.
