**Permanence Protocol**

**Pseudonymous research notes with on-chain integrity timestamps.**

---

## What This Is

A public archive for early-stage research :- hypotheses, observations, findings, questions, where contributors post under unique nicknames and every record receives a SHA-256 hash timestamped on Arbitrum Sepolia.

Readers browse without signing in. Contributors sign in with Privy, choose a nickname, and publish. Others respond with Support, Challenge, or Evidence.

**Status:** v0.1 prototype. Testnet only. No external anchoring. No cryptographic user consent. See [Limits](#limits).

---

## Quick Start

```bash
git clone https://github.com/Valorian0108/permanence-protocol.git
cd permanence-protocol
npm install
cp .env.example .env.local
# Fill in .env.local
npm run dev
```

Open http://localhost:3000

---

## How It Works

```
Write record → Save text to Supabase → Compute SHA-256 hash
     ↓                                          ↓
Display in public archive          Backend signer submits hash
                                          to Arbitrum Sepolia
```

**Records** contain main text plus optional type, sources, method, and limitations. New records use versioned hashing (v2) covering all fields. Legacy records and responses use text-only hashing (v1).

**Nicknames** are unique, editable, and displayed publicly. Wallet addresses are stored privately for authentication and rate limiting only.

**Responses** are marked Support, Challenge, or Evidence. They keep v1 text-only hashes.

---

## Limits

| What It Does | What It Doesn't |
|--------------|---------------|
| Prove a record existed at a time | Prove the contributor authorized it |
| Timestamp content hashes on testnet | Guarantee permanence or availability |
| Display pseudonymous attribution | Verify real-world identity |
| Allow public inspection | Enforce one-person-one-account |

**Critical:** The backend signer submits hashes. Contributor wallets do not sign. We cannot cryptographically prove user consent. Local signing (EIP-712) is planned for v0.2.

**Dependency:** Readable text lives in Supabase. If Supabase dies, on-chain hashes are orphaned. External anchoring is planned.

---

## Tech Stack

- **Frontend:** Next.js 14, React 18, TypeScript
- **Database:** Supabase Postgres
- **Auth:** Privy (embedded wallets)
- **Blockchain:** Solidity, ethers.js, Arbitrum Sepolia
- **Animation:** GSAP

---

## Environment

| Variable | Purpose | Secret? |
|----------|---------|---------|
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy client | No |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | No |
| `PRIVY_APP_ID` / `PRIVY_APP_SECRET` / `PRIVY_VERIFICATION_KEY` | Server auth | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Database writes | **Yes** |
| `PRIVATE_KEY` | Testnet signer | **Yes** |
| `ARBITRUM_SEPOLIA_RPC_URL` | RPC access | Private |

Never commit `.env` files. Never use a mainnet wallet as the testnet signer.

---

## Database

Apply in order:
1. `server/database/schema.sql`
2. `server/database/migrations/20261003_flexible_record_context.sql`
3. `server/database/migrations/20261004_contributor_nicknames.sql`

Keep independent backups. Test restoration. The on-chain hash cannot reconstruct lost text.

---

## Contract

- **Network:** Arbitrum Sepolia (421614)
- **Address:** `0x213B5321d98B2E01204C827712Ca9D580cEF9bEd`
- **Explorer:** [Arbiscan](https://sepolia.arbiscan.io/address/0x213B5321d98B2E01204C827712Ca9D580cEF9bEd#code)

Test deployment. Do not send valuable assets.

---

## Contributing

Issues welcome. Keep the central distinction clear: **preserving a record ≠ certifying a claim**.

For security issues, contact maintainers privately before public disclosure.

---

## License

MIT
