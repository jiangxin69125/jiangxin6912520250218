# My GitHub Project

Minimal Express app with a browser demo for the login-protected, CSRF-protected echo flow.

## Run locally

```sh
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000), login with `admin` / `password`, type a message, and submit the form. The page fetches `/csrf-token`, keeps the HttpOnly cookies in the browser, then sends `POST /echo` with the `x-csrf-token` header.

For local demo credentials, set `DEMO_USERNAME` and `DEMO_PASSWORD`. In production, also set `CSRF_SECRET`.

## Useful commands

```sh
npm test
npm run check
```

On Windows PowerShell, if script execution policy blocks `npm.ps1`, use `npm.cmd test` and `npm.cmd run check`.
