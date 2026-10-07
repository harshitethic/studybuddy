# Security Policy

## Supported version

Security fixes target the current `main` branch.

## Reporting a vulnerability

Do not post secrets, private student data, or an exploitable vulnerability in a public issue. Provide reproduction steps, impact, and sanitized logs.

## Project-specific notes

StudyBuddy stores study data in the browser and can connect to a local backend/Ollama instance. Security reports are especially useful for:

- cross-site scripting through subject/topic content;
- unsafe handling of localStorage data;
- backend endpoints exposed beyond the intended local network;
- request validation issues;
- accidental exposure of local AI endpoints or environment variables;
- dependency vulnerabilities with a practical impact on the app.

Avoid entering sensitive personal information into development/test instances.

## Secrets

Never commit tokens, local environment files, or private student data.
