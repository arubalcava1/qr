# WiFi QR
Download this extension: https://chromewebstore.google.com/detail/wifi-qr/pjmnibhcagmfogffflbjbnepiibfphbh?authuser=0&hl=en
A Chrome extension that turns a WiFi network name and password into a scannable QR code — so you can hand someone your WiFi without reading a password out loud or typing it into their phone.

![WiFi QR popup](docs/screenshot.png)

## Features

- **Instant QR generation** — fully offline, entirely client-side, nothing ever leaves the browser
- **Copy or download** the code as a PNG
- **Recent networks** remembered locally, so returning networks don't need retyping
- Auto light/dark theme, matches your OS

## Install (unpacked, for development)

1. Clone this repo
2. Open `chrome://extensions`
3. Toggle **Developer mode** on (top right)
4. Click **Load unpacked** and select this folder

## How it works

Generating the QR builds a payload in the standard `WIFI:T:WPA;S:<ssid>;P:<password>;;` format (with proper escaping of `\ ; , : "` per the spec) and renders it with a vendored copy of [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) by Kazuhiko Arase (MIT licensed, see [`lib/qrcode.js`](lib/qrcode.js)). Modules are drawn to a `<canvas>` in the extension's own ink color rather than the library's default black, then exported as a PNG data URL.

Recent networks are stored with `chrome.storage.local` — device-only, never synced. See [`docs/PRIVACY.md`](docs/PRIVACY.md) for the full policy.

## Project structure

```
manifest.json     MV3 manifest
popup.html/.css/.js   the popup UI
background.js     service worker — keeps the toolbar badge in sync with saved history
lib/qrcode.js      vendored QR encoder (MIT, kazuhikoarase/qrcode-generator)
icons/            toolbar icons (16/32/48/128)
make_icons.py     regenerates icons/ from scratch (requires Pillow: pip install Pillow) — not shipped in the packaged extension
docs/             screenshot + privacy policy
```

## License

MIT — see [`LICENSE`](LICENSE). The vendored QR encoder in `lib/qrcode.js` carries its own MIT license header from the original author.