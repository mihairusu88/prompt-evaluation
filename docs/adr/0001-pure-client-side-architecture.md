# Pure client-side architecture with direct browser LLM calls

The app is a React SPA with no backend. The browser calls OpenAI and Anthropic
directly using the user's own API key, which means enabling the SDKs' explicit
browser escape hatches (`dangerouslyAllowBrowser: true`, and for Anthropic the
`anthropic-dangerous-direct-browser-access: true` header to clear CORS) and
storing the key in `localStorage`. We chose this for simplicity — it's a
single-user local tool where the key never leaves the user's machine except to go
straight to the provider.

## Consequences

- The API key is readable in the browser (devtools, localStorage). This is
  acceptable only because it's the user's own key on their own machine. It would
  be unacceptable for a hosted/multi-user deployment.
- Anything requiring server execution is off the table — this is why Code Checks
  are pure non-executing validators (JSON-valid only for now) and Bash/JS
  execution checks were dropped.
- Introducing a database later means introducing a backend, at which point key
  handling should move server-side and this decision is revisited.
