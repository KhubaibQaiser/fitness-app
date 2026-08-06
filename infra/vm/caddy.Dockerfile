# Caddy with the DuckDNS DNS-01 module — free wildcard-capable TLS on the
# free pilot domain without exposing port 80 dependencies.
FROM caddy:2-builder AS builder
RUN xcaddy build --with github.com/caddy-dns/duckdns

FROM caddy:2
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
