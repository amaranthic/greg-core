# greg-core

[![license](https://img.shields.io/npm/l/@amaranthic/greg-sdk.svg?style=flat-square&color=blue)](LICENSE)
[![bun](https://img.shields.io/badge/tested%20with-bun-fbf0df.svg?style=flat-square&logo=bun&logoColor=black)](https://bun.sh)
[![node](https://img.shields.io/badge/node-%3E%3D22.0.0-339933.svg?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/types-TypeScript-3178C6.svg?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)

> **Monorepo powering the Greg agent ecosystem, agent runtime, and execution harnesses.**

---

## 📦 Packages in this Monorepo

| Package | Version | Description | Path |
|---|---|---|---|
| [`@amaranthic/greg-sdk`](https://www.npmjs.com/package/@amaranthic/greg-sdk) | `0.1.1` | Unified AI agent runtime built on Vercel AI SDK v7 with multi-provider routing and mandatory per-request credentials | [`packages/sdk`](packages/sdk) |
| `@amaranthic/greg-agent-core` | *Upcoming* | Core agent harnesses, tool execution loops, memory orchestration, and ACP | [`packages/agent-core`](packages/agent-core) |

---

## 🛠️ Monorepo Commands

This monorepo is managed using [Bun Workspaces](https://bun.sh/docs/install/workspaces):

```bash
# Install all workspace dependencies
bun install

# Run test suites across all packages
bun test

# Typecheck all packages
bun run typecheck

# Build all packages
bun run build
```

---

## 📜 Contributing & Architecture

For engineering guardrails, casing rules, test architecture, and JSDoc requirements, see [CONTRIBUTING.md](CONTRIBUTING.md).

## 📄 License

[MIT](LICENSE) © [Amaranthic](https://github.com/amaranthic)
