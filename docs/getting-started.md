# Using @hathq/dom-renderer

Render a validated display plan into native DOM elements with controlled interactions.

## Before you start

Untrusted content is rendered as data. Arbitrary HTML, scripts and remote renderer definitions are not accepted.

## First steps

Make the exact declared dependency artifacts available before installation. Local archives are excluded from Git; registry publication remains pending.

Run from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm test
```

## How to assess the result

- Create bounded, accessible display structures.
- Bind actions to exact declared handles.

A passing source-level check establishes only what that check observes. Keep missing configuration, unavailable services and unverified deployment paths visible.

## Continue reading

[Repository overview](../README.md)
