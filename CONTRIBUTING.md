# Contributing

Thank you for your interest in Headless Recorder. We welcome patches and contributions. The
project records browser interactions and generates Playwright tests for the Checkly API and
browser monitoring service.

## New feature guidelines

When authoring new features or extending existing ones, consider the following:

- All new features should be accompanied first with a Github issues describing the feature and its necessity.
- We aim for simplicity. Too many options, buttons, panels etc. detract from that.
- Features should serve the general public. Very specific things for your use case are frowned upon.

## Getting set up

1. Clone this repository

```bash
git clone https://github.com/checkly/headless-recorder
cd headless-recorder
```

2. Install [Bun](https://bun.com/) 1.4 or later, then install dependencies.

```bash
bun install
```

## Code reviews

All submissions, including submissions by project members, require review. We
use GitHub pull requests for this purpose. Consult
[GitHub Help](https://help.github.com/articles/about-pull-requests/) for more
information on using pull requests.

> Note: one pull request should cover one, atomic feature and/or bug fix. Do not submit pull requests with a plethora of updates, tweaks, fixes and new features.

## Code style

- Oxfmt defines the code format in `.oxfmtrc.json`.
- Oxlint defines the lint rules in `.oxlintrc.json`.
- Comments should be generally avoided. If the code would not be understood without comments, consider re-writing the code to make it self-explanatory.

Format and lint the project with:

```bash
bun run format
bun run lint
```

## Commit Messages

Commit messages should follow the Semantic Commit Messages format:

```
label(namespace): title

description

footer
```

1. _label_ is one of the following:
   - `fix` - bug fixes.
   - `feat` - features.
   - `docs` - changes to docs, e.g. `docs(api.md): ..` to change documentation.
   - `test` - changes to test infrastructure.
   - `style` - code style changes, such as spaces, alignment, and wrapping.
   - `chore` - build-related work, e.g. doclint changes / travis / appveyor.
2. _namespace_ is put in parenthesis after label and is optional.
3. _title_ is a brief summary of changes.
4. _description_ is **optional**, new-line separated from title and is in present tense.

Example:

```
fix(code-generator): fix page.pizza method

This patch fixes page.pizza so that it works with iframes.

Fixes #123, Fixes #234
```

## Adding New Dependencies

For all dependencies (both installation and development):

- **Do not add** a dependency if the desired functionality is easily implementable.
- If adding a dependency, it should be well-maintained and trustworthy.

A barrier for introducing new installation dependencies is especially high:

- **Do not add** installation dependency unless it's critical to project success.

## Writing Tests

- Every feature should be accompanied by a test.
- Every public api event/method should be accompanied by a test.
- Tests should be _hermetic_. Tests should not depend on external services.

We use Vitest for testing. Tests are in the `__tests__` folders.

- To run all tests:

```bash
bun run test
```

Run the full local check before you open a pull request:

```bash
bun run check
```
