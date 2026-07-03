import { readFileSync } from 'fs'
import { join } from 'path'

function esc(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function row(label: string, value: string | null | undefined) {
  if (!value) return ''
  return `
    <tr>
      <td style="padding:5px 8px;font-weight:600;font-size:10pt;color:#374151;width:38%;white-space:nowrap;vertical-align:top">${esc(label)}</td>
      <td style="padding:5px 8px;font-size:10.5pt;color:#111;border-bottom:1px solid #e5e7eb;vertical-align:top">${esc(value)}</td>
    </tr>`
}

function logoImg(): string {
  try {
    const data = readFileSync(join(process.cwd(), 'public', 'logo-lsi-800px.png'))
    const src = `data:image/png;base64,${data.toString('base64')}`
    return `<img src="${src}" alt="LSI Maintenance" style="height:56px;max-width:200px;object-fit:contain;display:block">`
  } catch {
    return `<div style="font-size:17pt;font-weight:800;color:#1d4ed8;letter-spacing:-0.5px">LSI Maintenance<br><span style="font-size:8.5pt;color:#6b7280;font-weight:normal">Support &amp; Infogérance</span></div>`
  }
}

export type MovementForHandover = {
  firstName: string
  lastName: string
  role: string | null
  mobile: string | null
  email: string | null
  accessVPN: boolean
  accessServer: boolean
  date: Date
  client: { name: string }
  assignedEquipment: {
    type: string
    brand: string | null
    model: string | null
    serialNumber: string | null
  } | null
}

export type Accessory = { name: string; qty?: number }

export type EmailAccountAction =
  | { action: 'redirect'; to: string }
  | { action: 'delete' }
  | null

function baseStyles(printable: boolean): string {
  const printCss = printable ? `
    @page { size: A4 portrait; margin: 2cm 2.2cm; }
    .print-btn { display:block;margin:20px auto 0;padding:8px 20px;background:#1d4ed8;color:#fff;border:none;border-radius:5px;font-size:10pt;cursor:pointer }
    @media print { .print-btn { display:none } }` : ''
  return `
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#111;background:#fff;line-height:1.45}
    .wrap{max-width:720px;margin:0 auto;padding:24px}
    .page-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:14px;border-bottom:2px solid #1d4ed8}
    .doc-meta{text-align:right;font-size:9pt;color:#555;line-height:1.7}
    .doc-meta strong{color:#111}
    h1{font-size:13pt;font-weight:700;text-align:center;text-transform:uppercase;letter-spacing:1.5px;color:#1d4ed8;border:2px solid #1d4ed8;padding:9px 16px;margin-bottom:24px}
    .section{margin-bottom:20px}
    .section-title{font-size:8.5pt;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#1d4ed8;border-bottom:1.5px solid #1d4ed8;padding-bottom:3px;margin-bottom:10px}
    table{width:100%;border-collapse:collapse}
    .sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:32px}
    .sig-label{font-size:9pt;font-weight:700;color:#374151;margin-bottom:8px}
    .sig-box{border:1px solid #d1d5db;border-radius:4px;height:80px}
    .page-footer{margin-top:28px;border-top:1px solid #e5e7eb;padding-top:7px;font-size:8pt;color:#9ca3af;text-align:center}
    ${printCss}`
}

export function generateAttributionHtml(
  m: MovementForHandover,
  accessories: Accessory[],
  printable = false,
): string {
  const dateDoc = new Date(m.date).toLocaleDateString('fr-FR')
  const dateNow = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
  const eq = m.assignedEquipment
  const eqLabel = eq ? [eq.brand, eq.model].filter(Boolean).join(' ') || eq.type : null

  const printScript = printable
    ? `<button class="print-btn" onclick="window.print()">Imprimer / Enregistrer en PDF</button>
       <script>window.addEventListener('load', () => setTimeout(() => window.print(), 400))</script>`
    : ''

  const accessoriesList = accessories.length > 0
    ? `<ul style="margin:6px 0 0;padding-left:20px;font-size:10.5pt;color:#111;line-height:1.8">
        ${accessories.map(a => `<li>${esc(a.qty && a.qty > 1 ? `${a.qty}× ` : '')}${esc(a.name)}</li>`).join('')}
       </ul>`
    : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Attribution — ${esc(m.firstName)} ${esc(m.lastName)}</title>
  <style>${baseStyles(printable)}</style>
</head>
<body>
<div class="wrap">

  <div class="page-header">
    <div>${logoImg()}</div>
    <div class="doc-meta">
      <div>Date : <strong>${esc(dateDoc)}</strong></div>
      <div>Client : <strong>${esc(m.client.name)}</strong></div>
    </div>
  </div>

  <h1>Bon d'Attribution de Matériel</h1>

  <div class="section">
    <div class="section-title">Bénéficiaire</div>
    <table>
      ${row('Nom', m.lastName)}
      ${row('Prénom', m.firstName)}
      ${row('Poste / Fonction', m.role)}
      ${row('Téléphone', m.mobile)}
      ${row('E-mail', m.email)}
    </table>
  </div>

  <div class="section">
    <div class="section-title">Matériel Attribué</div>
    ${eq ? `<table>
      ${row('Type', eq.type)}
      ${row('Modèle', eqLabel)}
      ${row('N° de série', eq.serialNumber)}
    </table>` : ''}
    ${accessoriesList}
    ${!eq && accessories.length === 0 ? `<p style="font-size:10pt;color:#9ca3af;font-style:italic;padding:6px 8px">Aucun matériel attribué</p>` : ''}
  </div>

  ${(m.accessVPN || m.accessServer) ? `
  <div class="section">
    <div class="section-title">Accès Informatiques</div>
    <table>
      ${m.accessVPN ? row('Accès VPN', 'Oui') : ''}
      ${m.accessServer ? row('Accès serveur', 'Oui') : ''}
    </table>
  </div>` : ''}

  <div class="sig-grid">
    <div>
      <div class="sig-label">Signature du bénéficiaire :</div>
      <div class="sig-box"></div>
    </div>
    <div>
      <div class="sig-label">Visa LSI Maintenance :</div>
      <div class="sig-box"></div>
    </div>
  </div>

  <div class="page-footer">Document généré le ${esc(dateNow)} — LSI Maintenance</div>

  ${printScript}
</div>
</body>
</html>`
}

export function generateRepriseHtml(
  m: MovementForHandover,
  reprise: string,
  emailAccount: EmailAccountAction = null,
  printable = false,
): string {
  const dateDoc = new Date(m.date).toLocaleDateString('fr-FR')
  const dateNow = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const printScript = printable
    ? `<button class="print-btn" onclick="window.print()">Imprimer / Enregistrer en PDF</button>
       <script>window.addEventListener('load', () => setTimeout(() => window.print(), 400))</script>`
    : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Reprise — ${esc(m.firstName)} ${esc(m.lastName)}</title>
  <style>${baseStyles(printable)}</style>
</head>
<body>
<div class="wrap">

  <div class="page-header">
    <div>${logoImg()}</div>
    <div class="doc-meta">
      <div>Date : <strong>${esc(dateDoc)}</strong></div>
      <div>Client : <strong>${esc(m.client.name)}</strong></div>
    </div>
  </div>

  <h1>Bon de Reprise de Matériel</h1>

  <div class="section">
    <div class="section-title">Remettant</div>
    <table>
      ${row('Nom', m.lastName)}
      ${row('Prénom', m.firstName)}
      ${row('Poste / Fonction', m.role)}
      ${row('Téléphone', m.mobile)}
      ${row('E-mail', m.email)}
    </table>
  </div>

  <div class="section">
    <div class="section-title">Matériel en Reprise</div>
    <div style="border:1px solid #d1d5db;border-radius:4px;min-height:60px;padding:8px 10px;font-size:10.5pt;color:#111;white-space:pre-wrap">
      ${reprise ? esc(reprise) : '<span style="color:#9ca3af;font-style:italic">Aucun matériel listé</span>'}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Compte E-mail</div>
    <table>
      ${emailAccount?.action === 'redirect'
        ? `${row('Action', 'Rediriger le courrier')}${row('Destinataire', emailAccount.to)}`
        : emailAccount?.action === 'delete'
          ? row('Action', 'Supprimer le compte')
          : row('Action', 'Aucune action définie')}
    </table>
  </div>

  <div class="sig-grid">
    <div>
      <div class="sig-label">Signature du remettant :</div>
      <div class="sig-box"></div>
    </div>
    <div>
      <div class="sig-label">Visa LSI Maintenance :</div>
      <div class="sig-box"></div>
    </div>
  </div>

  <div class="page-footer">Document généré le ${esc(dateNow)} — LSI Maintenance</div>

  ${printScript}
</div>
</body>
</html>`
}

/** @deprecated Utiliser generateAttributionHtml ou generateRepriseHtml */
export function generateHandoverHtml(
  m: MovementForHandover,
  reprise: string,
  printable = false,
): string {
  const dateDoc = new Date(m.date).toLocaleDateString('fr-FR')
  const dateNow = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
  const eq = m.assignedEquipment
  const eqLabel = eq
    ? [eq.brand, eq.model].filter(Boolean).join(' ') || eq.type
    : null

  const printStyles = printable ? `
    @page { size: A4 portrait; margin: 2cm 2.2cm; }
    .print-btn { display:block;margin:20px auto 0;padding:8px 20px;background:#1d4ed8;color:#fff;border:none;border-radius:5px;font-size:10pt;cursor:pointer }
    @media print { .print-btn { display:none } }` : ''

  const printScript = printable
    ? `<button class="print-btn" onclick="window.print()">Imprimer / Enregistrer en PDF</button>
       <script>window.addEventListener('load', () => setTimeout(() => window.print(), 400))</script>`
    : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Prise en charge — ${esc(m.firstName)} ${esc(m.lastName)}</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#111;background:#fff;line-height:1.45}
    .wrap{max-width:720px;margin:0 auto;padding:24px}
    .page-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:14px;border-bottom:2px solid #1d4ed8}
    .brand{font-size:17pt;font-weight:800;color:#1d4ed8;letter-spacing:-0.5px}
    .brand-sub{font-size:8.5pt;color:#6b7280;font-weight:normal;margin-top:2px}
    .doc-meta{text-align:right;font-size:9pt;color:#555;line-height:1.7}
    .doc-meta strong{color:#111}
    h1{font-size:13pt;font-weight:700;text-align:center;text-transform:uppercase;letter-spacing:1.5px;color:#1d4ed8;border:2px solid #1d4ed8;padding:9px 16px;margin-bottom:24px}
    .section{margin-bottom:20px}
    .section-title{font-size:8.5pt;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#1d4ed8;border-bottom:1.5px solid #1d4ed8;padding-bottom:3px;margin-bottom:10px}
    table{width:100%;border-collapse:collapse}
    .reprise-content{border:1px solid #d1d5db;border-radius:4px;min-height:48px;padding:8px 10px;font-size:10.5pt;color:#111;margin-top:4px}
    .reprise-empty{color:#9ca3af;font-style:italic}
    .sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:32px}
    .sig-label{font-size:9pt;font-weight:700;color:#374151;margin-bottom:8px}
    .sig-box{border:1px solid #d1d5db;border-radius:4px;height:80px}
    .page-footer{margin-top:28px;border-top:1px solid #e5e7eb;padding-top:7px;font-size:8pt;color:#9ca3af;text-align:center}
    ${printStyles}
  </style>
</head>
<body>
<div class="wrap">

  <div class="page-header">
    <div>
      <div class="brand">LSI Maintenance</div>
      <div class="brand-sub">Support &amp; Infogérance</div>
    </div>
    <div class="doc-meta">
      <div>Date du mouvement : <strong>${esc(dateDoc)}</strong></div>
      <div>Client : <strong>${esc(m.client.name)}</strong></div>
    </div>
  </div>

  <h1>Bon de Prise en Charge de Matériel</h1>

  <div class="section">
    <div class="section-title">Réceptionnaire</div>
    <table>
      ${row('Nom', m.lastName)}
      ${row('Prénom', m.firstName)}
      ${row('Poste / Fonction', m.role)}
      ${row('Téléphone', m.mobile)}
      ${row('E-mail', m.email)}
    </table>
  </div>

  ${eq ? `
  <div class="section">
    <div class="section-title">Matériel Attribué</div>
    <table>
      ${row('Type', eq.type)}
      ${row('Modèle', eqLabel)}
      ${row('N° de série', eq.serialNumber)}
    </table>
  </div>` : ''}

  <div class="section">
    <div class="section-title">Matériel en Reprise</div>
    <div class="reprise-content${reprise ? '' : ' reprise-empty'}">
      ${reprise ? esc(reprise) : 'Aucun matériel en reprise'}
    </div>
  </div>

  ${(m.accessVPN || m.accessServer) ? `
  <div class="section">
    <div class="section-title">Accès Informatiques</div>
    <table>
      ${m.accessVPN ? row('Accès VPN', 'Oui') : ''}
      ${m.accessServer ? row('Accès serveur', 'Oui') : ''}
    </table>
  </div>` : ''}

  <div class="sig-grid">
    <div>
      <div class="sig-label">Signature du réceptionnaire :</div>
      <div class="sig-box"></div>
    </div>
    <div>
      <div class="sig-label">Visa LSI Maintenance :</div>
      <div class="sig-box"></div>
    </div>
  </div>

  <div class="page-footer">Document généré le ${esc(dateNow)} — LSI Maintenance</div>

  ${printScript}
</div>
</body>
</html>`
}
