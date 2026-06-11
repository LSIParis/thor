const SKU_LABELS: Record<string, string> = {
  MICROSOFT_365_BUSINESS_BASIC:       'Business Basic',
  MICROSOFT_365_BUSINESS_ESSENTIALS:  'Business Basic',
  O365_BUSINESS_ESSENTIALS:           'Business Basic',
  O365_BUSINESS_ESSENTIAL:            'Business Basic',
  Microsoft_365_Business_Essentials:  'Business Basic',
  MICROSOFT_365_BUSINESS_STANDARD:    'Business Standard',
  O365_BUSINESS_PREMIUM:              'Business Standard',
  MICROSOFT_365_BUSINESS_PREMIUM:     'Business Premium',
  Microsoft_365_Business_Premium:     'Business Premium',
  SPE_E3:                             'M365 E3',
  SPE_E5:                             'M365 E5',
  ENTERPRISEPACK:                     'Office 365 E3',
  ENTERPRISEPREMIUM:                  'Office 365 E5',
  ATP_ENTERPRISE:                     'Defender for Office',
  ATP_ENTERPRISE_GOV:                 'Defender for Office',
  EXCHANGESTANDARD:                   'Exchange Plan 1',
  EXCHANGEENTERPRISE:                 'Exchange Plan 2',
  TEAMS_EXPLORATORY:                  'Teams Exploratory',
  TEAMS_FREE:                         'Teams Free',
  PROJECTPREMIUM:                     'Project Plan 5',
  PROJECTESSENTIALS:                  'Project Plan 1',
  VISIOCLIENT:                        'Visio Plan 2',
  POWER_BI_PRO:                       'Power BI Pro',
  POWER_BI_STANDARD:                  'Power BI Free',
  INTUNE_A:                           'Intune',
  EMS:                                'EMS E3',
  EMSPREMIUM:                         'EMS E5',
  AAD_PREMIUM:                        'Entra ID P1',
  AAD_PREMIUM_P2:                     'Entra ID P2',
  WINDOWS_STORE:                      'Microsoft Store',
  FLOW_FREE:                          'Flow Free',
}

export function labelSku(sku: string): string {
  return SKU_LABELS[sku] ?? sku.replace(/_/g, ' ')
}

const FREE_SKUS = new Set([
  'FLOW_FREE',
  'POWER_BI_STANDARD',
  'TEAMS_FREE',
  'TEAMS_EXPLORATORY',
])

export function isFree(sku: string): boolean {
  return FREE_SKUS.has(sku) || labelSku(sku).toLowerCase().includes('free')
}

export function sortSkus(skus: string[]): string[] {
  return [...skus].sort((a, b) => {
    const fa = isFree(a) ? 1 : 0
    const fb = isFree(b) ? 1 : 0
    if (fa !== fb) return fa - fb
    return labelSku(a).localeCompare(labelSku(b), 'fr')
  })
}
