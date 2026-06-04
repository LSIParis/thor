import crypto from 'crypto'
import axios from 'axios'

const BASE_URLS: Record<string, string> = {
  'ovh-eu': 'https://eu.api.ovh.com/1.0',
  'ovh-ca': 'https://ca.api.ovh.com/1.0',
  'ovh-us': 'https://api.us.ovhcloud.com/1.0',
}

export class OvhClient {
  private readonly baseUrl: string

  constructor(
    endpoint: string,
    private readonly appKey: string,
    private readonly appSecret: string,
    private readonly consumerKey: string,
  ) {
    this.baseUrl = BASE_URLS[endpoint] ?? BASE_URLS['ovh-eu']
  }

  private sign(method: string, url: string, body: string, timestamp: number): string {
    const toSign = [this.appSecret, this.consumerKey, method, url, body, timestamp].join('+')
    return '$1$' + crypto.createHash('sha1').update(toSign).digest('hex')
  }

  async get<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const timestamp = Math.floor(Date.now() / 1000)
    const signature = this.sign('GET', url, '', timestamp)
    const resp = await axios.get<T>(url, {
      headers: {
        'X-Ovh-Application': this.appKey,
        'X-Ovh-Consumer': this.consumerKey,
        'X-Ovh-Timestamp': String(timestamp),
        'X-Ovh-Signature': signature,
      },
      timeout: 10000,
    })
    return resp.data
  }
}
