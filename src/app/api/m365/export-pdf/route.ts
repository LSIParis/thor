import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/access'
import { prisma } from '@/lib/db'
import fs from 'fs'
import path from 'path'
import { labelSku, sortSkus } from '@/lib/m365-sku-labels'

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function GET(req: NextRequest) {
  const session = await requireAuth()
  const selectedClientId = req.nextUrl.searchParams.get('client') ?? undefined
  const selectedTenantId = req.nextUrl.searchParams.get('tenant') ?? undefined

  const userId = session.user.id
  const role   = session.user.role
  const accessFilter = role === 'ADMIN' ? {} : { users: { some: { userId } } }
  const clientFilter = selectedClientId
    ? (role === 'ADMIN'
        ? { id: selectedClientId }
        : { id: selectedClientId, users: { some: { userId } } })
    : accessFilter

  const tenantFilter = selectedTenantId ? { some: { id: selectedTenantId } } : { some: {} }

  const clients = await prisma.client.findMany({
    where: { ...clientFilter, m365Tenants: tenantFilter },
    select: {
      id: true, name: true,
      m365Tenants: {
        where: selectedTenantId ? { id: selectedTenantId } : undefined,
        orderBy: { displayName: 'asc' },
        select: {
          id: true, displayName: true, tenantId: true,
          accounts: {
            where: { licensed: true },
            orderBy: { displayName: 'asc' },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  // Logo embarqué en base64
  let logoDataUrl = ''
  try {
    const buf = fs.readFileSync(path.join(process.cwd(), 'public', 'logo-lsi-800px.png'))
    logoDataUrl = `data:image/png;base64,${buf.toString('base64')}`
  } catch { /* logo absent */ }

  const now      = new Date()
  const dateStr  = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const totalLicensed = clients.reduce(
    (s, c) => s + c.m365Tenants.reduce((t, tn) => t + tn.accounts.length, 0), 0
  )

  // ── Génération des sections ─────────────────────────────────────
  let sectionsHtml = ''

  for (const client of clients) {
    const tenants = client.m365Tenants.filter((tn) => tn.accounts.length > 0)
    if (!tenants.length) continue

    let tenantsHtml = ''

    for (const tenant of tenants) {
      // Collecter tous les SKUs distincts du tenant
      const skuSet = new Set<string>()
      for (const a of tenant.accounts) {
        if (!a.licenseType) continue
        for (const s of a.licenseType.split(', ')) skuSet.add(s.trim())
      }
      const skus = sortSkus([...skuSet])
      if (!skus.length) continue

      // En-têtes colonnes SKU (tournées -60°)
      const skuHeaders = skus.map((sku) => `
        <th class="col-sku">
          <div class="sku-label">${esc(labelSku(sku))}</div>
        </th>`).join('')

      // Lignes utilisateurs
      const rows = tenant.accounts.map((a, i) => {
        const userSkus = new Set(
          (a.licenseType ?? '').split(', ').map((s) => s.trim()).filter(Boolean)
        )
        const skuCells = skus.map((sku) =>
          userSkus.has(sku)
            ? `<td class="cell-yes">✓</td>`
            : `<td class="cell-no"></td>`
        ).join('')
        const rowClass = i % 2 === 0 ? 'row-even' : 'row-odd'
        return `
          <tr class="${rowClass}">
            <td class="col-name">${esc(a.displayName)}</td>
            <td class="col-email">${esc(a.userPrincipalName)}</td>
            ${skuCells}
          </tr>`
      }).join('')

      // Totaux par SKU (réutilisés pour badges et ligne de total)
      const skuCounts = skus.map((sku) =>
        tenant.accounts.filter(
          (a) => a.licenseType && a.licenseType.split(', ').map((s) => s.trim()).includes(sku)
        ).length
      )

      // Badges résumé par SKU
      const skuBadges = skus.map((sku, i) =>
        `<span class="badge">${esc(labelSku(sku))} <strong>${skuCounts[i]}</strong></span>`
      ).join('')


      const tenantDomain = tenant.tenantId
        ? `<span class="tenant-domain">${esc(tenant.tenantId)}</span>` : ''

      tenantsHtml += `
        <div class="tenant-block">
          <div class="tenant-header">
            <div class="tenant-title">
              <span class="tenant-name">${esc(tenant.displayName)}</span>
              ${tenantDomain}
            </div>
            <div class="tenant-badges">${skuBadges}</div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th class="col-name-h">Nom</th>
                  <th class="col-email-h">Adresse mail</th>
                  ${skuHeaders}
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>`
    }

    if (!tenantsHtml) continue

    sectionsHtml += `
      <div class="client-section">
        <div class="client-header">
          <span class="client-icon">⬡</span>
          <span class="client-name">${esc(client.name)}</span>
        </div>
        ${tenantsHtml}
      </div>`
  }

  // ── HTML final ─────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Licences Microsoft 365 — LSI-Maintenance</title>
  <style>
    /* ── Reset & base ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { font-size: 10px; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      color: #1e2d3a;
      background: #f4f7f9;
      padding: 0;
    }

    /* ── Toolbar (masqué à l'impression) ── */
    .toolbar {
      position: sticky; top: 0; z-index: 100;
      display: flex; align-items: center; gap: 10px;
      padding: 10px 24px;
      background: #1e2d3a;
      border-bottom: 3px solid #3abfbf;
      box-shadow: 0 2px 8px rgba(0,0,0,.25);
    }
    .toolbar-title { flex: 1; color: #fff; font-size: 1.2rem; font-weight: 600; letter-spacing: .3px; }
    .btn {
      padding: 7px 18px; border: none; border-radius: 5px;
      cursor: pointer; font-size: 1.2rem; font-family: inherit; font-weight: 500;
      transition: opacity .15s;
    }
    .btn:hover { opacity: .85; }
    .btn-pdf  { background: #3abfbf; color: #fff; }
    .btn-close { background: rgba(255,255,255,.12); color: #fff; }
    .toolbar-hint { font-size: 1.1rem; color: rgba(255,255,255,.55); margin-left: 6px; }
    .toolbar-hint strong { color: #3abfbf; }

    /* ── Wrapper page ── */
    .page-wrap { max-width: 960px; margin: 24px auto; padding: 0 16px 40px; }

    /* ── En-tête document ── */
    .doc-header {
      background: linear-gradient(135deg, #1e2d3a 0%, #2a4a5a 100%);
      border-radius: 10px 10px 0 0;
      padding: 28px 32px 24px;
      display: flex; align-items: center; justify-content: space-between;
      gap: 24px;
    }
    .doc-header img { height: 52px; filter: brightness(0) invert(1); }
    .doc-header-right { text-align: right; }
    .doc-title {
      color: #fff; font-size: 1.9rem; font-weight: 700; letter-spacing: .5px;
      line-height: 1.2;
    }
    .doc-subtitle { color: #3abfbf; font-size: 1.2rem; font-weight: 500; margin-top: 4px; }
    .doc-meta {
      background: #3abfbf;
      padding: 8px 32px;
      display: flex; align-items: center; gap: 24px;
      font-size: 1.15rem; color: #fff;
    }
    .doc-meta strong { font-weight: 700; }
    .doc-meta-sep { opacity: .5; }

    /* ── Sections clients ── */
    .client-section { margin-top: 24px; }
    .client-header {
      display: flex; align-items: center; gap: 10px;
      background: #1e2d3a; color: #fff;
      padding: 10px 20px; border-radius: 6px 6px 0 0;
      font-size: 1.3rem; font-weight: 700; letter-spacing: .4px;
    }
    .client-icon { color: #3abfbf; font-size: 1.0rem; }

    /* ── Blocs tenant ── */
    .tenant-block {
      background: #fff;
      border: 1px solid #d0dde6;
      border-top: none;
      margin-bottom: 2px;
    }
    .tenant-block:last-child { border-radius: 0 0 6px 6px; }

    .tenant-header {
      background: #eaf6f6;
      border-bottom: 2px solid #3abfbf;
      padding: 8px 16px;
      display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;
    }
    .tenant-title { display: flex; align-items: baseline; gap: 10px; }
    .tenant-name { font-size: 1.25rem; font-weight: 700; color: #1e6b6b; }
    .tenant-domain { font-family: monospace; font-size: 1.0rem; color: #6b8a99; }
    .tenant-badges { display: flex; flex-wrap: wrap; gap: 6px; }
    .badge {
      background: #fff; border: 1px solid #3abfbf; border-radius: 20px;
      padding: 2px 10px; font-size: 1.0rem; color: #1e6b6b; white-space: nowrap;
    }
    .badge strong { color: #3abfbf; margin-left: 3px; }

    /* ── Table ── */
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 1.0rem; }

    /* En-têtes fixes */
    thead tr { background: #1e2d3a; }
    th { color: #fff; font-weight: 600; padding: 0; vertical-align: bottom; border: 1px solid #2e3f4f; }
    th.col-name-h  { padding: 8px 12px; text-align: left; min-width: 130px; vertical-align: middle; }
    th.col-email-h { padding: 8px 12px; text-align: left; min-width: 180px; vertical-align: middle; }

    /* En-têtes SKU tournés */
    th.col-sku { width: 56px; min-width: 56px; max-width: 56px; padding: 8px 4px 6px; }
    .sku-label {
      display: block;
      writing-mode: vertical-lr;
      transform: rotate(180deg);
      font-size: .95rem;
      color: #c8dde8;
      max-height: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      padding: 4px 0;
    }

    /* Lignes */
    td { border: 1px solid #e0eaef; padding: 5px 10px; vertical-align: middle; }
    td.col-name  { font-weight: 500; color: #1e2d3a; white-space: nowrap; }
    td.col-email { font-family: monospace; font-size: .95rem; color: #4a6070; white-space: nowrap; }
    .row-even { background: #fff; }
    .row-odd  { background: #f5fafa; }
    tr:hover  { background: #eaf6f6 !important; }

    /* Cellules SKU */
    .cell-yes {
      text-align: center; font-size: 1.2rem; font-weight: 700;
      color: #3abfbf;
    }
    .cell-no {
      text-align: center; background: #f7f9fa;
      border-color: #e0eaef;
    }

    /* ── Pied de page document ── */
    .doc-footer {
      background: #1e2d3a; color: rgba(255,255,255,.5);
      font-size: 1.0rem; padding: 10px 32px;
      display: flex; align-items: center; justify-content: space-between;
      border-radius: 0 0 10px 10px;
      margin-top: 2px;
    }
    .doc-footer span { color: rgba(255,255,255,.8); }

    /* ── Print ── */
    .print-repeat-header { display: none; }
    @page { margin: 1.2cm 1cm 1cm; }
    @media print {
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      html, body { margin: 0 !important; padding: 0 !important; background: #fff; height: auto !important; }
      .toolbar { display: none !important; }
      .page-wrap { max-width: none !important; margin: 0 !important; padding: 0 !important; }
      .doc-header { border-radius: 0; }
      .doc-footer { border-radius: 0; }
      .client-header  { page-break-after: avoid; }
      .tenant-header  { page-break-after: avoid; }
      /* En-tête répété sur chaque page */
      .print-repeat-header {
        display: flex !important;
        position: fixed;
        top: -0.9cm; left: 0; right: 0;
        justify-content: space-between;
        align-items: center;
        background: #1e2d3a;
        color: rgba(255,255,255,.8);
        font-size: 7.5pt;
        padding: 3px 1cm;
        border-bottom: 2px solid #3abfbf;
      }
      .print-repeat-header strong { color: #3abfbf; }
    }
  </style>
</head>
<body>

  <!-- En-tête répété à l'impression (fixe, invisible à l'écran) -->
  <div class="print-repeat-header">
    <span>LSI-Maintenance — <strong>Licences Microsoft 365</strong></span>
    <span>${dateStr}</span>
  </div>

  <div class="page-wrap">

    <!-- En-tête document -->
    <div class="doc-header">
      ${logoDataUrl ? `<img src="${logoDataUrl}" alt="LSI-Maintenance">` : '<span style="color:#fff;font-size:1.6rem;font-weight:700">LSI-MAINTENANCE</span>'}
      <div class="doc-header-right">
        <div class="doc-title">Licences Microsoft 365</div>
        <div class="doc-subtitle">Rapport des comptes sous abonnement</div>
      </div>
    </div>
    <div class="doc-meta">
      <span>Généré le <strong>${dateStr}</strong></span>
      <span class="doc-meta-sep">|</span>
      <span><strong>${totalLicensed}</strong> compte${totalLicensed !== 1 ? 's' : ''} sous abonnement</span>
      ${selectedClientId ? '' : `<span class="doc-meta-sep">|</span><span>Tous les clients</span>`}
    </div>

    <!-- Contenu -->
    ${sectionsHtml || '<p style="padding:24px;color:#666;font-size:1.2rem">Aucun compte avec licence trouvé.</p>'}

    <!-- Pied de page -->
    <div class="doc-footer">
      <span>LSI-Maintenance — Document confidentiel — Usage client uniquement</span>
      <span>© ${now.getFullYear()} LSI-Maintenance</span>
    </div>

  </div>

  <!-- Toolbar (en bas pour ne pas perturber l'impression) -->
  <div class="toolbar">
    <span class="toolbar-title">Microsoft 365 — Rapport licences</span>
    <button class="btn btn-pdf"   onclick="window.print()">⬇ Enregistrer en PDF</button>
    <button class="btn btn-close" onclick="window.close()">✕ Fermer</button>
    <span class="toolbar-hint">Dans la boîte d'impression, sélectionnez l'orientation <strong>Paysage</strong></span>
  </div>

</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
