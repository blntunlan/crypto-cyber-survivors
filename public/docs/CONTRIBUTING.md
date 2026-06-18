# Contributing to Crypto Survivors 🚀

First off, thank you for considering contributing to Crypto Survivors! It's people like you that make high-performance crypto survival games possible.

## 🌈 Our Standards

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for our commit messages:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes that affect the build system or external dependencies

## 🛠️ Development Workflow

1. **Fork the repo** and create your branch from `main`.
2. **Setup environment**: Run `npm install`.
3. **Write code**: Follow the project's coding standards (Atomic design for UI, Singleton for services).
4. **Test your changes**:
   - Run unit tests: `npm run test`
   - Run E2E tests: `npm run test:e2e`
5. **Lint & Format**: Run `npm run lint:fix` and `npm run format`.
6. **Submit a Pull Request**: Use our PR template and describe your changes clearly.

## 🎯 Coding Standards

- **React 19 Hooks**: Use the latest React patterns.
- **TypeScript**: Always use strict typing. Avoid `any`.
- **Game Engine**: Never use `useState` inside the `GameEngine` render loop. Use Singletons or `useRef`.
- **Performance**: Use `PoolManager` for any repeating entities (projectiles, enemies).

## 🐛 Reporting Bugs

- Use the **Bug Report** template.
- Provide a clear description and reproduction steps.
- Attach screenshots if possible.
- For beta-specific gameplay, performance, market, wallet, replay, or onboarding feedback, use the **Beta Feedback** template.

## 💡 Feature Requests

- Use the **Feature Request** template.
- Explain why this feature is valuable to the community.

Thank you for being part of the Crypto Survivors community! 💎🙌
