# Contributing to StudyBuddy

Pull requests are welcome.

## Local setup

```bash
npm install
npm run dev
```

For real local AI:

```bash
ollama run llama3.2:1b
```

## Guidelines

- Keep the app usable without a paid API.
- Never commit API keys or secrets.
- Keep AI features optional with a working fallback.
- Keep the UI responsive.
- Prefer simple, understandable code.
