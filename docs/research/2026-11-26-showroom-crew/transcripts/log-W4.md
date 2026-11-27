# log W4 (bundler)

- 2026-11-27 ~00:40 ET (05:40 UTC): wrote tools/solo-bundle.js. Verified on app/solo/303.html with --test: lint ok, worklet engine, master peak 0.47, overflow 0 at 1280x800 and iPhone 13; screenshots viewed.
- Read log-W2.md: framework is `Solo.boot({global:'HVTD'...})`, api has host() and engine string; the probe finds any window.HVT*/Solo* object with host(). Header/bar/gate may be built by solo.js, so the gutter rules also cover .so-head/.so-bar/.so-panel/.so-help/.so-gate.
- Only 303.html existed at the end; --all covered it alone. Untested on W2/W3 pages.
