import { prisma } from '@/lib/db'

type GraphUser = {
  id: string
  displayName: string
  userPrincipalName: string
  userType: string | null
  jobTitle: string | null
  accountEnabled: boolean
  assignedLicenses: { skuId: string }[]
  createdDateTime: string | null
}

type SkuEntry = {
  skuId: string
  skuPartNumber: string
  consumedUnits: number
  prepaidUnits: { enabled: number }
}

export async function syncTenant(tenantDbId: string): Promise<{ synced: number }> {
  const tenant = await prisma.m365Tenant.findUniqueOrThrow({
    where: { id: tenantDbId },
    select: {
      id: true, clientId: true, displayName: true,
      tenantId: true, azureClientId: true, azureClientSecret: true,
    },
  })

  if (!tenant.tenantId || !tenant.azureClientId || !tenant.azureClientSecret) {
    throw new Error(`Tenant "${tenant.displayName}" : credentials Azure manquants.`)
  }

  // Token
  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${tenant.tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: tenant.azureClientId,
        client_secret: tenant.azureClientSecret,
        scope: 'https://graph.microsoft.com/.default',
      }),
    }
  )
  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    throw new Error(`Erreur d'authentification Azure (${tenant.displayName}) : ${err}`)
  }
  const { access_token } = await tokenRes.json() as { access_token: string }
  const headers = { Authorization: `Bearer ${access_token}` }

  // SKUs
  const skuMap: Record<string, string> = {}
  const skusRes = await fetch(
    'https://graph.microsoft.com/v1.0/subscribedSkus?$select=skuId,skuPartNumber,consumedUnits,prepaidUnits',
    { headers }
  )
  if (skusRes.ok) {
    const { value = [] } = await skusRes.json() as { value: SkuEntry[] }
    for (const s of value) {
      skuMap[s.skuId] = s.skuPartNumber
      await prisma.m365LicenseSku.upsert({
        where: { tenantId_skuId: { tenantId: tenantDbId, skuId: s.skuId } },
        update: { skuPartNumber: s.skuPartNumber, consumed: s.consumedUnits, total: s.prepaidUnits.enabled },
        create: { tenantId: tenantDbId, skuId: s.skuId, skuPartNumber: s.skuPartNumber, consumed: s.consumedUnits, total: s.prepaidUnits.enabled },
      })
    }
  }

  // Domains
  type GraphDomain = { id: string; isDefault: boolean; isVerified: boolean }
  const domainsRes = await fetch(
    'https://graph.microsoft.com/v1.0/domains?$select=id,isDefault,isVerified',
    { headers }
  )
  if (domainsRes.ok) {
    const { value: graphDomains = [] } = await domainsRes.json() as { value: GraphDomain[] }
    for (const gd of graphDomains) {
      const existing = await prisma.m365Domain.findFirst({
        where: { tenantId: tenantDbId, domain: gd.id },
      })
      if (!existing) {
        await prisma.m365Domain.create({
          data: { tenantId: tenantDbId, domain: gd.id, isDefault: gd.isDefault },
        })
      } else {
        await prisma.m365Domain.update({
          where: { id: existing.id },
          data: { isDefault: gd.isDefault },
        })
      }
    }
  }

  // Users (paginated)
  const users: GraphUser[] = []
  let url: string | null =
    'https://graph.microsoft.com/v1.0/users?$select=id,displayName,userPrincipalName,userType,jobTitle,accountEnabled,assignedLicenses,createdDateTime&$top=999'

  while (url) {
    const res = await fetch(url, { headers })
    if (!res.ok) {
      const body = await res.text()
      const msg = `Graph /users ${res.status} ${res.statusText} — ${body}`
      console.error('[m365 sync]', msg)
      throw new Error(msg)
    }
    const data = await res.json() as { value: GraphUser[]; '@odata.nextLink'?: string }
    users.push(...data.value)
    url = data['@odata.nextLink'] ?? null
  }

  // Exclure les utilisateurs externes (invités)
  const internalUsers = users.filter(
    u => u.userType !== 'Guest' && !u.userPrincipalName.includes('#EXT#')
  )

  // Upsert accounts (tous les utilisateurs, y compris externes)
  for (const u of users) {
    const licensed = u.assignedLicenses.length > 0
    const licenseType = licensed
      ? u.assignedLicenses.map((l) => skuMap[l.skuId] ?? l.skuId).join(', ')
      : null

    await prisma.m365Account.upsert({
      where: { tenantId_userPrincipalName: { tenantId: tenantDbId, userPrincipalName: u.userPrincipalName } },
      update: { graphId: u.id, displayName: u.displayName, jobTitle: u.jobTitle ?? null, licensed, licenseType, accountEnabled: u.accountEnabled, m365CreatedAt: u.createdDateTime ? new Date(u.createdDateTime) : undefined },
      create: { tenantId: tenantDbId, graphId: u.id, displayName: u.displayName, userPrincipalName: u.userPrincipalName, jobTitle: u.jobTitle ?? null, licensed, licenseType, accountEnabled: u.accountEnabled, m365CreatedAt: u.createdDateTime ? new Date(u.createdDateTime) : null },
    })
  }

  // ── Sync contacts depuis les comptes actifs ───────────────────────────────
  const clientId = tenant.clientId

  const defaultSite = await prisma.site.findFirst({
    where: { clientId, isDefault: true },
    select: { id: true },
  })
  const defaultSiteId = defaultSite?.id ?? null

  for (const u of internalUsers) {
    if (!u.accountEnabled || !u.displayName?.trim()) continue

    const email = u.userPrincipalName.includes('#EXT#')
      ? null
      : u.userPrincipalName.toLowerCase()

    const parts     = u.displayName.trim().split(/\s+/)
    const firstName = parts[0] ?? ''
    const lastName  = parts.slice(1).join(' ') || '—'
    const role      = u.jobTitle ?? null

    if (email) {
      const existing = await prisma.contact.findFirst({ where: { clientId, email } })
      if (existing) {
        await prisma.contact.update({
          where: { id: existing.id },
          data: {
            firstName, lastName, role,
            ...(existing.siteId === null && defaultSiteId ? { siteId: defaultSiteId } : {}),
          },
        })
      } else {
        await prisma.contact.create({
          data: { clientId, firstName, lastName, email, role, siteId: defaultSiteId },
        })
      }
    } else {
      const existing = await prisma.contact.findFirst({ where: { clientId, firstName, lastName } })
      if (!existing) {
        await prisma.contact.create({
          data: { clientId, firstName, lastName, role, siteId: defaultSiteId },
        })
      }
    }
  }

  await prisma.m365Tenant.update({
    where: { id: tenantDbId },
    data: { lastSyncAt: new Date() },
  })

  return { synced: users.length }
}
