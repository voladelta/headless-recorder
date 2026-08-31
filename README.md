# Headless Recorder

<p align="center">
  <img width="200" src="./assets/logo.png" alt="Headless Recorder" />
</p>

Headless Recorder is a Chrome extension that records browser interactions and generates
[Playwright](https://playwright.dev/) or [Puppeteer](https://pptr.dev/) scripts.

> [!IMPORTANT]
> This repository is an independent, modernized fork of
> [Checkly's original Headless Recorder](https://github.com/checkly/headless-recorder). Checkly
> deprecated the original project on 16 December 2022. This fork is not the Chrome Web Store
> release. See the [upstream deprecation notice](https://github.com/checkly/headless-recorder/issues/232)
> for its history and alternatives.

## Modern stack

- Chrome Manifest V3 with a restart-safe background service worker
- Vue 3 and Vite 8
- Tailwind CSS 4
- Bun for dependency management and project scripts
- Oxlint, Oxfmt, and Vitest for code quality and testing

## Features

- Record clicks, text input, selection changes, and keyboard events.
- Generate Playwright and Puppeteer scripts.
- Add navigation waits, viewport settings, and selector waits.
- Preview CSS selectors.
- Take full-page and element screenshots.
- Pause, resume, or restart a recording.
- Keep the latest generated script in local browser storage.
- Copy generated code to the clipboard.
- Configure custom data attributes for element selection.
- Use light or dark mode.

## Use the extension

1. Select the extension icon.
2. Select the red record button.
3. Interact with the page that you want to record.
4. Press <kbd>Tab</kbd> after you enter text in an input field.
5. Wait for each page navigation to finish before you continue.
6. Pause the recorder when you must navigate without recording.
7. Stop the recorder to generate the script.

### Keyboard shortcuts

- <kbd>Alt</kbd> + <kbd>K</kbd>: Show or hide the overlay.
- <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>F</kbd>: Take a full-page screenshot.
- <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>E</kbd>: Take an element screenshot.

## Develop locally

Install [Bun](https://bun.com/) 1.4 or later. Then run:

```bash
bun install
bun run dev
```

The development command rebuilds the extension in `dist` when a source file changes.

To create a production build, run:

```bash
bun run build
```

## Install the local build

1. Run `bun run build`.
2. Open [`chrome://extensions`](chrome://extensions) in Chrome.
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Select the `dist` directory from this repository.

## Validate changes

Run the complete static and unit-test check:

```bash
bun run check
```

Run the Chrome integration tests separately:

```bash
bun run test:integration
```

If Puppeteer does not have a compatible test browser, install Chrome for Testing:

```bash
bunx puppeteer browsers install chrome
```

The available individual checks are:

```bash
bun run format:check
bun run lint
bun run test
bun run build
```

## Project history

Headless Recorder was built from existing open-source projects, including
[Daydream](https://github.com/segmentio/daydream) and
[UI Recorder](https://github.com/yguan/ui-recorder). This fork keeps the original project history
and license while updating its browser platform and development toolchain.

## License

[MIT](./LICENSE)
