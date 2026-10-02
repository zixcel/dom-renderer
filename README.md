# @hathq/dom-renderer

Render a validated display plan into native DOM elements with controlled interactions.

## What you can do

- Create bounded, accessible display structures.
- Bind actions to exact declared handles.

## Current scope

Untrusted content is rendered as data. Arbitrary HTML, scripts and remote renderer definitions are not accepted.

Package distribution is not activated by this documentation. Use the checked-in source and the declared dependency versions; published availability must be verified separately.

## Getting started

The manifest currently requires locally supplied package archives: `@zixcel/interaction`. These archives are excluded from Git. Obtain the exact approved dependency artifacts before installing; a fresh clone alone is not sufficient. Registry distribution remains pending.

Use the package manager matching the checked-in lockfile and the Node.js version declared in `package.json` or the development configuration. Run from this repository:

```sh
pnpm install --frozen-lockfile
pnpm test
```

## Documentation and source

[Interface reference](docs/interface-reference.md)

[Usage guide](docs/getting-started.md)

[Implementation and public interfaces](src) · [Verification cases](test) · [Contributing](CONTRIBUTING.md) · [Security reporting](SECURITY.md) · [License](LICENSE) · [Attribution notices](NOTICE)
