# Headless Recorder

<p align="center">
  <img width="200" src="./assets/logo.png" alt="Headless Recorder" />
</p>

Headless Recorder is a Chrome extension that records browser interactions and generates
[Playwright Test](https://playwright.dev/docs/intro) code.

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
- Generate Playwright tests with locator-based actions and automatic waiting.
- Add viewport settings to generated tests.
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

The result is a complete Playwright Test file. Save it with a `.spec.js` extension in a project
that has `@playwright/test` installed, then run it with `npx playwright test`.

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

### Test post_message with Brave WebMCP

Run `bun run dev` and `bun run webmcp:demo` in separate terminals. Load `dist` as an unpacked
extension in Brave. Open `brave://flags/#enable-webmcp-testing`, set **WebMCP for testing** to
**Enabled**, relaunch Brave, and open `http://127.0.0.1:4173`. Open the Headless Recorder popup
and select **Inject post_message**. Select **Call through WebMCP** to call `post_message` with
`{"text":"Hello from WebMCP"}` through Brave's native API. The tool appends plain text to the demo
page. It is restricted to loopback pages, inserts at most 1000 characters with `textContent`, and
does not send a network request.

### Define and call custom page tools from an agent

The extension can inject a generic WebMCP authoring runtime into the active HTTP or HTTPS page.
The runtime provides these manager tools:

- `webmcp_define_tool` defines or replaces a tool for the current origin.
- `webmcp_list_defined_tools` lists saved custom tools.
- `webmcp_remove_tool` removes a saved custom tool.

Custom tools use a constrained action format. Supported actions are `type`, `click`, `read`, and
`wait`. The runtime does not evaluate arbitrary JavaScript. Definitions are limited to 25 tools
per exact origin and 50 steps per tool.

To connect a local MCP agent without browser or computer control, add the bridge to Codex:

```bash
codex mcp add headless-recorder-webmcp -- bun /absolute/path/to/headless-recorder/src/bridge/server.js
```

Reload the unpacked `dist` extension after each build. Open its popup and select **Connect agent
bridge**. The extension reconnects to the loopback bridge on port 9321. A newly started Codex
session can then call:

- `webmcp_list_tools` to inspect the active page's native WebMCP registry.
- `webmcp_call_tool` to call a page tool by name with JSON input.
- `webmcp_runtime_status` to inspect the active page runtime.

For example, the agent can call `webmcp_define_tool` through `webmcp_call_tool` with this input:

```json
{
  "definition": {
    "name": "type_post",
    "description": "Type text into a post field without submitting it.",
    "inputSchema": {
      "type": "object",
      "properties": { "text": { "type": "string" } },
      "required": ["text"]
    },
    "steps": [
      {
        "op": "type",
        "selector": "textarea[name=\"post\"]",
        "input": "text"
      }
    ]
  }
}
```

The agent can then call `type_post` through `webmcp_call_tool` with
`{"text":"Hello through WebMCP"}`. Definitions are saved for their exact origin and restored the
next time the runtime is enabled there. See [examples/webmcp-tools.json](examples/webmcp-tools.json)
for separate `type_post` and `trigger_post` examples.

#### Live X example

The agent bridge was verified on `https://x.com` with an active signed-in Brave session. The agent
defined and called two origin-scoped tools:

- `type_post` selects `a[href="/compose/post"]`, waits for
  `div[role="textbox"][data-testid="tweetTextarea_0"]`, and types the supplied `text` value.
- `trigger_post` selects `button[data-testid="tweetButton"]` to publish the prepared post.

The contenteditable `type` action inserts escaped plain text through the browser editor command.
This produces the trusted input event that controlled editors such as X require. The extension
also pings the active page before script injection so one page document has only one runtime and
one tool call produces one action.

These selectors are examples for the current X interface. X can change them. Define replacement
tools if the page structure changes. Keep preparation and publication as separate tools so the
agent or user can inspect the draft before the destructive `trigger_post` call.

The MCP bridge binds only to `127.0.0.1`. It accepts browser connections only from extension
origins. Set `WEBMCP_EXTENSION_ID` on the MCP server if you also want to require one exact unpacked
extension ID.

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

If Playwright does not have a compatible test browser, install Chromium:

```bash
bunx playwright install chromium
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
