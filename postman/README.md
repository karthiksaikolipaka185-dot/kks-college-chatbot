# KKS College Chatbot API - Postman Test Suite

Automated API test collection and environment definitions for the KKS College Chatbot backend service.

---

## Files Included

- **`KKS-College-Chatbot.postman_collection.json`**: Primary automated test collection organized into 4 logical folders (`Health & Documentation`, `Authentication`, `Chat Assistant`, and `Voice Assistant`) with safety opt-in guards.
- **`KKS-College-Manual-Voice-Call.postman_collection.json`**: Isolated, manual-only collection for testing real outbound voice calls via Vapi with mandatory explicit opt-in.
- **`Local.postman_environment.json`**: Environment variables configured for local development (`http://localhost:5000`).
- **`Production.postman_environment.json`**: Environment variables configured for production Vercel deployment (`https://kks-chatbot-backend.vercel.app`).

---

## Environment Variables & Safety Flags

| Variable | Description | Default | Safe Mode Behavior |
| :--- | :--- | :--- | :--- |
| `baseUrl` | Target API server base URL | `http://localhost:5000` | Local / Remote endpoint |
| `authToken` | JWT Bearer token captured automatically from successful login | *(empty)* | Populated at runtime |
| `testEmail` | Sample student email for authentication tests | `postman.student@example.com` | Safe test placeholder |
| `testPassword` | Sample password for testing authentication | `Password123!` | Safe test placeholder |
| `ENABLE_USER_REGISTRATION` | Explicit opt-in to create test users in database | `"false"` | Request skipped if not `"true"` |
| `ENABLE_AUTH_LOGIN` | Explicit opt-in to attempt user login | `"false"` | Request skipped if not `"true"` |
| `ENABLE_LIVE_AI_TESTS` | Explicit opt-in to send live queries to Groq/LLM | `"false"` | Request skipped if not `"true"` |
| `ENABLE_OUTBOUND_CALLS` | Mandatory explicit opt-in for outbound Vapi calls | `"false"` | Call blocked and aborted if not `"true"` |

> [!IMPORTANT]
> All automated suites run with safe defaults. No production test accounts are created, no live LLM tokens are consumed, and no outbound telephone calls are triggered unless explicitly authorized.

---

## Import Instructions in Postman

1. Open Postman Desktop or Web.
2. Click **Import** (top-left button or `Ctrl+O`).
3. Drag and drop the collection and environment files:
   - `postman/KKS-College-Chatbot.postman_collection.json`
   - `postman/KKS-College-Manual-Voice-Call.postman_collection.json`
   - `postman/Local.postman_environment.json`
   - `postman/Production.postman_environment.json`
4. In the top-right environment selector, choose either **KKS College - Local** or **KKS College - Production**.

---

## Running with Newman CLI

### Safe Automated Run (Default)
Runs all health, documentation, input validation, and security check requests without mutating data or making third-party API calls:
```bash
npx newman run postman/KKS-College-Chatbot.postman_collection.json -e postman/Local.postman_environment.json
```

### Full Integration Run (Opt-In)
To explicitly enable user creation and live chat testing against a local dev instance:
```bash
npx newman run postman/KKS-College-Chatbot.postman_collection.json -e postman/Local.postman_environment.json \
  --env-var "ENABLE_USER_REGISTRATION=true" \
  --env-var "ENABLE_AUTH_LOGIN=true" \
  --env-var "ENABLE_LIVE_AI_TESTS=true"
```
