# @amaranthic/hernex

Execution harness and runtime engine built for Greg and autonomous agent workflows on Vercel AI SDK.

## Installation

```bash
bun add @amaranthic/hernex
```

## Overview

`@amaranthic/hernex` is an execution package built for Greg that users can freely use on their own:
- **Model Routing**: Single-string provider resolution (`provider/model_id`) with credential isolation.
- **Agent Microkernel**: Autonomous turn loop with pure serializable events and inward lifecycle hooks.
- **Tool Harness**: Workspace-confined tools (`readFile`, `writeFile`, `editFile`, `bash`, `glob`, `grep`).
- **State & Rollback**: Optional thread persistence and content-addressed file delta checkpointing.

## Documentation

Technical specifications are detailed in [`docs/`](docs/):
- [Agent Engine](docs/agent.md) · [Hooks](docs/hooks.md) · [Events](docs/events.md) · [Tools](docs/tools.md)

## License: MIT
