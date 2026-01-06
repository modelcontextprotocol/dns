import * as pulumi from '@pulumi/pulumi';
import * as cloudflare from '@pulumi/cloudflare';
import { DNS_RECORDS } from './config/records';

const config = new pulumi.Config();
const accountId = config.require('cloudflareAccountId');

for (const [domain, records] of Object.entries(DNS_RECORDS)) {
  const zone = cloudflare.getZoneOutput({
    filter: {
      name: domain,
      account: { id: accountId },
    },
  });

  // Track counts for generating unique names when same subdomain+type appears multiple times
  const nameCounts: Record<string, number> = {};

  for (const record of records) {
    const baseKey = `${record.subdomain}-${record.type}`;
    const count = nameCounts[baseKey] ?? 0;
    nameCounts[baseKey] = count + 1;

    // e.g., "modelcontextprotocol.io-@-A" or "modelcontextprotocol.io-@-TXT-2" for duplicates
    const resourceName = count === 0 ? `${domain}-${baseKey}` : `${domain}-${baseKey}-${count + 1}`;

    new cloudflare.DnsRecord(resourceName, {
      zoneId: zone.id,
      name: record.subdomain,
      type: record.type,
      content: record.content,
      ttl: record.ttl ?? 1,
      proxied: record.proxied ?? false,
      priority: record.priority,
      comment: record.comment,
    });
  }
}
