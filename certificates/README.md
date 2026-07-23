# Dev HTTPS certificates

This directory holds a local, [mkcert](https://github.com/FiloSottile/mkcert)-issued
certificate for the dev server. `docker-compose.yml`'s `app` service uses it to run
`next dev --experimental-https`, which is required for camera capture
(`getUserMedia`) to work when testing from a phone/tablet on the LAN - browsers
only allow camera/mic access in a secure context, and a plain `http://` LAN IP
never qualifies as one.

The `.pem` files themselves are gitignored (see the root `*.pem` rule) and not
committed - each developer generates their own.

## Setup (once per machine)

```sh
brew install mkcert nss
mkcert -install   # installs a local CA into your system/browser trust stores
cd certificates
mkcert -key-file localhost-key.pem -cert-file localhost.pem \
  localhost 127.0.0.1 ::1 <your-lan-ip> <your-hostname>.fritz.box
cp "$(mkcert -CAROOT)/rootCA.pem" rootCA.pem
```

Then `docker compose up -d app` (a plain `restart` won't pick up a changed
`command:`, since that requires recreating the container).

## Trusting it on a phone/tablet

The certificate is only trusted by devices that trust the CA that issued it.
For each phone/tablet you want to test from:

1. AirDrop or email `rootCA.pem` to the device.
2. Open it - iOS will prompt to install a configuration profile (Settings →
   General → VPN & Device Management → install).
3. **iOS only**: afterwards, go to Settings → General → About → Certificate
   Trust Settings, and toggle full trust for the certificate. Installing the
   profile alone isn't enough for root CAs.

## If your LAN IP changes

Prefer accessing the dev server via your machine's stable local hostname
(e.g. `https://<hostname>.fritz.box:3000`) instead of the raw IP - it survives
DHCP lease renewals. If you do need to add a new IP, regenerate the
certificate with the extra address (same `mkcert` command as above) and add it
to `allowedDevOrigins` in `next.config.ts` - no need to reinstall anything on
already-trusted devices, since they trust the CA, not this specific
certificate.
