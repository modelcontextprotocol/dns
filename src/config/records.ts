import type { RecordType } from './utils';

export const DNS_RECORDS: Record<string, DnsRecordConfig[]> = {
  'modelcontextprotocol.io': [
    // Root domain
    { subdomain: '@', type: 'A', content: '76.76.21.21', proxied: false },

    // Spec subdomain
    { subdomain: 'spec', type: 'A', content: '76.76.21.21', proxied: false },

    // Registry
    { subdomain: 'registry', type: 'CNAME', content: 'prod.registry.modelcontextprotocol.io', proxied: false },
    { subdomain: 'prod.registry', type: 'A', content: '34.61.200.254', proxied: false },
    { subdomain: 'staging.registry', type: 'A', content: '35.222.36.75', proxied: false },
    { subdomain: 'grafana.prod.registry', type: 'A', content: '34.61.200.254', proxied: false },
    { subdomain: 'grafana.staging.registry', type: 'A', content: '35.222.36.75', proxied: false },

    // GitHub Pages sites
    { subdomain: 'blog', type: 'CNAME', content: 'modelcontextprotocol.github.io', proxied: false },
    { subdomain: 'example-client', type: 'CNAME', content: 'modelcontextprotocol.github.io', proxied: false },
    { subdomain: 'static', type: 'CNAME', content: 'modelcontextprotocol.github.io', proxied: false },

    // Other subdomains
    { subdomain: 'example-server', type: 'CNAME', content: 'ghs.googlehosted.com', proxied: true },
    { subdomain: 'meet', type: 'CNAME', content: 'mcp.meetable.org', proxied: false },

    // MX record for Google Workspace
    { subdomain: '@', type: 'MX', content: 'smtp.google.com', priority: 1, comment: 'ITOPS-9980' },

    // SPF record
    { subdomain: '@', type: 'TXT', content: 'v=spf1 include:_spf.google.com ~all' },

    // DKIM for Google Workspace
    {
      subdomain: 'google._domainkey',
      type: 'TXT',
      content:
        'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtwBNpASgdq3T9tXSFRh3tu9s6bLVBeGtug5Tv5f5D9K2G8n3Ov7KgR8IEyIgWaVuFf+z82NUBtXlDfKRxRu6s9ND+SqPkgVey2IVx4VuHHUJMAC1f4Wst7ZAUmyeo9lf6PpPb7xzr4nSVbN9jbIFDAajsCe+M9TYdkIU9PXdraYpIVc6b+vE7EaiaCdXNWHzIVjo4wFBz4UsNKG1UsO53GZNyXfnxFFPQppaNYEXOfblYtxgW4BhKpBQhT9fC07EKyoUApe2AC8rcX83HBOKKvISR6TbMruv5p82lz1veIcpixRkZfIFDlxMF66yzFs5qdfY8ztRHbri4kw4DVygmwIDAQAB',
      comment: 'ITOPS-9980',
    },

    // Google site verifications
    { subdomain: '@', type: 'TXT', content: 'google-site-verification=0jJ1JQ6pdBjRe2r6UCzi2RJbsjvglJUmekPb5rpUQXQ' },
    { subdomain: '@', type: 'TXT', content: 'google-site-verification=UI0Tjq-ecUgNu3kFATkW87qcabX6kTljsbYjms2-FdQ' },

    // Other TXT verifications
    { subdomain: '@', type: 'TXT', content: 'czyymtp25a' },
    { subdomain: '_gh-modelcontextprotocol-o', type: 'TXT', content: '8f29e697fc' },
    { subdomain: '_github-pages-challenge-modelcontextprotocol.blog', type: 'TXT', content: '1d4b431f4dc23d532fd33da4596bcf' },
  ],
};

interface DnsRecordConfig {
  subdomain: string;
  type: RecordType;
  content: string;
  ttl?: number;
  proxied?: boolean;
  priority?: number;
  comment?: string;
}
