# dom-renderer interface reference

Use the [usage guide](getting-started.md) for the first steps. This reference preserves the current interface details and operational limits. Run command examples from the repository root, after preparing the exact declared dependencies and registered configuration.

## Caller-owned presentation

Product work status and semantic reason descriptions belong to the installed caller. `SceneRenderer` accepts a trusted `describeUnresolved(reason)` slot; without it, the renderer displays the original reason without interpreting it. This callback is supplied by trusted application code, never by a delivered scene or package data.
