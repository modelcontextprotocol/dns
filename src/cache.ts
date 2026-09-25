import * as pulumi from '@pulumi/pulumi';
import * as cloudflare from '@pulumi/cloudflare';

// ---------------------------------------------------------------------------
// Edge caching for the MCP registry's read-heavy list endpoint (POC).
//
// Context: registry issue #1323 found that GET /v0/servers cannot absorb high
// request volumes — above ~300 RPS the service spikes on CPU, goroutines
// (8k–12k at peak) and heap, and requests time out waiting on the Postgres
// queue. The DB queries themselves are not the bottleneck; the service just
// can't soak up the request volume. The maintainer's recommended fix is a CDN
// caching layer in front of the registry, and Cloudflare is a natural fit
// because modelcontextprotocol.io DNS is already managed here via the
// Cloudflare provider.
//   https://github.com/modelcontextprotocol/registry/issues/1323#issuecomment-4745822992
//
// This file adds a Cloudflare cache ruleset that makes
//   GET https://registry.modelcontextprotocol.io/v0/servers
// cacheable at the edge. The `registry` DNS record is switched to proxied
// (orange-cloud) in src/config/records.ts so this traffic actually flows
// through Cloudflare — a cache rule has no effect on a DNS-only record.
//
// NOTE (POC): the defaults below are intentionally conservative and meant as a
// starting point for maintainer discussion. The knobs most worth tuning are
// EDGE_TTL_SECONDS (staleness vs. origin-offload) and the cache-key query
// params. See the PR description for the proxying considerations (origin TLS,
// real-client-IP headers, and cache invalidation on registry writes).
// ---------------------------------------------------------------------------

const config = new pulumi.Config();
const accountId = config.require('cloudflareAccountId');

// The zone that hosts the registry, resolved the same way src/dns.ts resolves
// zones for DNS records.
const REGISTRY_ZONE = 'modelcontextprotocol.io';

// Public API hostname that serves /v0/servers.
const REGISTRY_HOST = 'registry.modelcontextprotocol.io';

// Conservative edge TTL. The registry origin does not currently emit
// Cache-Control headers, so we override the origin and cache for a short
// window. Even 60s of edge caching collapses a flood of identical list
// requests into a single origin hit per page. Tune upward once maintainers are
// comfortable with the resulting staleness (and/or pair with active cache
// purges on registry writes — see PR description).
const EDGE_TTL_SECONDS = 60;

const registryZone = cloudflare.getZoneOutput({
  filter: {
    name: REGISTRY_ZONE,
    account: { id: accountId },
  },
});

// Cache rule in the http_request_cache_settings phase for the registry list
// endpoint. A zone may only have one ruleset per phase, so this single
// resource owns the registry's cache configuration.
export const registryCacheRuleset = new cloudflare.Ruleset('registry-cache', {
  zoneId: registryZone.id,
  name: 'Registry edge cache',
  description: 'Edge-cache GET /v0/servers on the registry (registry issue #1323).',
  kind: 'zone',
  phase: 'http_request_cache_settings',
  rules: [
    {
      ref: 'cache_v0_servers',
      description: 'Cache GET /v0/servers list responses at the edge, keyed by its query params.',
      // Scope narrowly: only the read-heavy list endpoint on the registry host,
      // GET only. Detail routes (/v0/servers/{name}) and writes are untouched.
      expression: `(http.host eq "${REGISTRY_HOST}" and http.request.method eq "GET" and http.request.uri.path eq "/v0/servers")`,
      action: 'set_cache_settings',
      actionParameters: {
        // Force the response to be cacheable even though the origin currently
        // sends no Cache-Control header.
        cache: true,
        edgeTtl: {
          mode: 'override_origin',
          default: EDGE_TTL_SECONDS,
          // Never cache error responses — only successful/redirect pages should
          // be served from the edge. value 0 == "no-cache".
          statusCodeTtls: [{ statusCodeRange: { from: 400, to: 599 }, value: 0 }],
        },
        // Build the cache key from exactly the query params that change the
        // /v0/servers response body, so each distinct page/filter caches as its
        // own entry — while unknown/tracking params don't fragment the cache (or
        // let someone blow past it with junk params). These mirror the endpoint's
        // ListServersInput: cursor, limit (paging) plus the search/version/
        // updated_since/include_deleted filters. Keep this list in sync if the
        // registry adds new query params, otherwise responses that differ only by
        // a new param would be incorrectly served from the same cache entry.
        cacheKey: {
          ignoreQueryStringsOrder: true,
          customKey: {
            queryString: {
              include: {
                lists: ['cursor', 'limit', 'search', 'version', 'updated_since', 'include_deleted'],
              },
            },
          },
        },
      },
    },
  ],
});
