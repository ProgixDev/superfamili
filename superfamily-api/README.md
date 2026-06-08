<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

---

## Didit KYC — testing the webhook locally with ngrok

Didit's hosted verification pages POST results back to a public URL. During
local development the backend runs on `http://localhost:3001`, which Didit
can't reach — we bridge it with [ngrok](https://ngrok.com/).

### 1. Install and authenticate ngrok

```bash
brew install ngrok          # or: https://ngrok.com/download
ngrok config add-authtoken <your-ngrok-token>
```

### 2. Start the backend

```bash
cd superfamily-api
npm run start:dev
```

The API listens on `http://localhost:3001`.

### 3. Start an ngrok tunnel

In a second terminal:

```bash
ngrok http 3001
```

ngrok prints a forwarding URL like:

```
Forwarding  https://a1b2-203-0-113-42.ngrok-free.app -> http://localhost:3001
```

### 4. Point the backend and the Didit console at the tunnel

Edit `superfamily-api/.env`:

```bash
PUBLIC_BASE_URL=https://a1b2-203-0-113-42.ngrok-free.app
```

Restart the backend so the new value is picked up. `createSession` will now
tell Didit that the callback URL is the tunnel.

Then in the Didit Business Console → **Webhooks** → **Add destination**,
set the destination URL to:

```
https://a1b2-203-0-113-42.ngrok-free.app/kyc/webhook
```

Hit **Test webhook**. You should see a `POST /kyc/webhook` in your backend
logs, with the signature verified and a `{ received: true }` response.

### 5. Run a full verification

From your authenticated frontend (or with `curl`):

```bash
curl -X POST https://a1b2-203-0-113-42.ngrok-free.app/kyc/session \
  -H "Authorization: Bearer $SUPABASE_EDUCATOR_JWT" \
  -H "Content-Type: application/json" \
  -d '{}'
```

The response body contains a `verification_url`. Open it in a mobile
browser, complete the flow, and watch the backend logs — you'll see the
webhook arriving with `webhook_type=status.updated` and the final
`status=Approved` (or `Declined` / `In Review`).

### 6. Troubleshooting

- **401 Unauthorized on webhooks** — signature mismatch. Check that
  `DIDIT_WEBHOOK_SECRET` in `.env` exactly matches what's in the Didit
  console. The secret is sensitive to trailing whitespace / newlines.
- **Webhook received but no row updated** — the `vendor_data` in the event
  doesn't match any existing `kyc_verifications.user_id`. Likely cause:
  the session was created outside of `POST /kyc/session`. Only sessions
  created by the backend have the correct `vendor_data` linkage.
- **5xx from Didit on `POST /v3/session/`** — check `DIDIT_API_KEY` and
  `DIDIT_WORKFLOW_ID` are set, and that the workflow is published (not
  draft).
- **Timestamp out of tolerance** — your local clock is skewed. Either fix
  it (`sudo sntp -sS time.apple.com` on macOS) or temporarily bump
  `DIDIT_WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS` to `3600` while debugging.

### 7. Do not commit your ngrok URL or `.env`

The ngrok free-tier URL rotates on every restart. Keep it in `.env` only.
Never paste real `DIDIT_API_KEY` or `DIDIT_WEBHOOK_SECRET` values into the
repo, chat logs, or issue comments — rotate immediately if you do.
