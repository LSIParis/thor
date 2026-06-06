import Mailgun from 'mailgun.js'
import FormData from 'form-data'

function getClient() {
  const apiKey = process.env.MAILGUN_API_KEY
  if (!apiKey) return null
  const mg = new Mailgun(FormData)
  return mg.client({ username: 'api', key: apiKey })
}

export const LSI_EMAIL = process.env.LSI_NOTIFY_EMAIL ?? 'contact@lsi-maintenance.fr'

export async function sendMail(opts: { to: string; subject: string; html: string }) {
  const client = getClient()
  if (!client) {
    console.warn('[mailer] MAILGUN_API_KEY non configuré — email non envoyé')
    return
  }
  const domain = process.env.MAILGUN_DOMAIN
  if (!domain) {
    console.warn('[mailer] MAILGUN_DOMAIN non configuré — email non envoyé')
    return
  }
  const from = process.env.MAILGUN_FROM ?? `LSI Maintenance <noreply@${domain}>`
  await client.messages.create(domain, { from, ...opts })
}
