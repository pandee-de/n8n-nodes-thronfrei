# n8n-nodes-thronfrei

n8n community node for [Thronfrei](https://thronfrei.de). It connects your family bathroom
status to any n8n workflow – in both directions.

- **Thronfrei Trigger** – start a workflow when a bathroom becomes occupied/free or an emergency
  is raised (`bad_besetzt`, `pipi_notruf`, …).
- **Thronfrei** (action) – check a user in/out, send emergencies, or read the current status.

## Installation

In n8n: **Settings → Community Nodes → Install** and enter `n8n-nodes-thronfrei`.

For local development:

```bash
npm install
npm run build
# link into your n8n instance's ~/.n8n/custom, or use n8n-node-dev
```

## Credentials

Create a **Thronfrei API** credential:

| Field | Value |
| --- | --- |
| Base URL | `https://automation.thronfrei.de` (default) |
| API Key | Family-scoped automation key (`tfa_…`), created in the app under **More → Smart Home** |
| Webhook Signing Secret | Optional – only needed if the Trigger node should verify HMAC signatures |

The API key is family-scoped, so every action runs inside that family. Which member an action
acts as is chosen per call (**User ID** field) or falls back to the key's default user.

## Thronfrei Trigger

The trigger is a webhook receiver:

1. Add the node, open it and copy the **Production URL**.
2. In the Thronfrei app under **More → Smart Home**, add a new target with that URL and select
   the events you want.
3. Optionally set a secret on the target and the same value in the credential, then enable
   **Verify Signature** on the node.

The workflow receives the event payload:

```json
{
  "app": "Thronfrei",
  "event": "pipi_notruf",
  "title": "Pipi-Notruf",
  "message": "Max wartet auf Bad oben.",
  "bathroom": "Bad oben",
  "person": "Max",
  "occurredAt": "2026-07-22T18:20:00.000Z"
}
```

## Thronfrei (action)

| Resource | Operation | Endpoint |
| --- | --- | --- |
| Bathroom | Check In | `POST /v1/bathrooms/:id/check-in` |
| Bathroom | Check Out | `POST /v1/bathrooms/:id/check-out` |
| Bathroom | List | `GET /v1/bathrooms` |
| Emergency | Pee | `POST /v1/emergencies/pee` |
| Emergency | Toilet Paper | `POST /v1/emergencies/toilet-paper` |
| Status | Get | `GET /v1/status` |

The bathroom dropdown is populated live from your family via `GET /v1/bathrooms`.

## Example workflows

- **Bad besetzt → Hue rot / Bad frei → grün**: Thronfrei Trigger (events `bad_besetzt`,
  `bad_frei`) → Switch on `{{$json.event}}` → Philips Hue.
- **Pipi-Notruf → Telegram**: Thronfrei Trigger (`pipi_notruf`) → Telegram.
- **Sensor an Klotür → Check-out**: any trigger → Thronfrei · Bathroom · Check Out.

## License

MIT
