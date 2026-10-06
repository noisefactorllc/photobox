# Contributing to Photobox

Thanks for your interest in contributing!

Contributions follow the Noise Factor
[contributing policy](https://github.com/noisefactorllc/.github/blob/main/CONTRIBUTING.md) and
[Code of Conduct](https://github.com/noisefactorllc/.github/blob/main/CODE_OF_CONDUCT.md). The policy covers which pull requests we
accept and what LLM-assisted pull requests need to include. This page adds
what's specific to Photobox.

## Getting Set Up

```bash
git clone https://github.com/noisefactorllc/photobox.git
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

1. Pick an issue labelled `help wanted` and comment on it to say you're working on it
2. Fork the repo and create a branch from `main`
3. Make your changes
4. Run `npm test` and make sure tests pass
5. Open a pull request and fill in the template

## Code Style

- Vanilla JavaScript — no frameworks, no transpilers
- ES modules (`import`/`export`)
- No build step — files in `public/` are served directly
- Keep it simple. If a feature needs a library, let's discuss it in an issue first.

## Reporting Issues

Open an issue on [GitHub](https://github.com/noisefactorllc/photobox/issues). Include your browser, OS, and steps to reproduce.
