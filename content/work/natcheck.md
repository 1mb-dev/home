---
name: natcheck
tagline: NAT type and direct P2P forecast
description: A NAT type check for WebRTC and P2P: one command forecasts whether direct connections will work from this network or TURN is needed. Go CLI, MIT.
tags: nat type, symmetric nat, stun, webrtc, p2p, turn
source: https://github.com/1mb-dev/natcheck
docs: https://1mb-dev.github.io/natcheck/
language: Go
shipped: 2026-04-19
listed: 2026-11-01
---

One command asks two public STUN servers how this network's NAT maps its traffic. Line one is the forecast: `Direct P2P: likely`, `possible`, `unlikely` or `unknown`. Below it come the NAT type and, when the probe can run, hairpinning. On a CGNAT network the forecast is `unknown`. `--json` gives a script the same report, and the exit code answers on its own.

When the two servers see different public ports, the NAT is symmetric: `Direct P2P: unlikely`, exit code 1.

A default run stops at `possible`: `likely` needs a STUN server that measures filtering. Cone detection was tested on Linux netfilter in a lab. No consumer router has been tried.

Homebrew or `go install`, Go 1.26 or later. One direct dependency, `pion/stun`.

## Why it exists

A WebRTC or P2P connection fails, and the question is what kind of NAT this is and whether direct connections will work. Answering it meant `stun-client`, an online classifier and RFC 5780.

natcheck puts the answer in one command.

## What it taught

A NAT test needs one socket. natcheck opened one per server, so it compared two local ports and called networks with no NAT symmetric. Tests with a stubbed prober passed. [Issue #28](https://github.com/1mb-dev/natcheck/issues/28) caught it.
