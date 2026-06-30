import createNextIntlPlugin from 'next-intl/plugin'
import type { NextConfig } from 'next'
import { execSync } from 'child_process'
import pkg from './package.json'

let buildSha = 'dev'
try { buildSha = execSync('git rev-parse --short HEAD').toString().trim() } catch {}

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_BUILD_SHA: buildSha,
  },
}

export default withNextIntl(nextConfig)
