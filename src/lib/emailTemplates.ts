import fs from 'fs'
import path from 'path'

const htmlPath = path.join(process.cwd(), 'src', 'emails', 'reset-code.html')
const textPath = path.join(process.cwd(), 'src', 'emails', 'reset-code.txt')

let htmlTpl = '<p>{{code}}</p>'
let textTpl = 'Your password reset code is: {{code}}'

try {
  htmlTpl = fs.readFileSync(htmlPath, 'utf8')
} catch {}
try {
  textTpl = fs.readFileSync(textPath, 'utf8')
} catch {}

import { t } from '@/lib/i18n'

export function renderResetCode(code: string, opts?: { appName?: string; supportUrl?: string; supportEmail?: string; locale?: string }) {
  const appName = opts?.appName ?? process.env.NEXT_PUBLIC_APP_NAME ?? 'App'
  const supportUrl = opts?.supportUrl ?? process.env.APP_SUPPORT_URL ?? '#'
  const supportEmail = opts?.supportEmail ?? process.env.APP_SUPPORT_EMAIL ?? 'support@example.com'
  const locale = opts?.locale ?? 'en'

  const title = t('title', locale)
  let footerTemplate = t('footer', locale)
  footerTemplate = footerTemplate.replace(/{{\s*supportUrl\s*}}/g, supportUrl)
  footerTemplate = footerTemplate.replace(/{{\s*supportEmail\s*}}/g, supportEmail)

  let html = htmlTpl.replace(/{{\s*code\s*}}/g, String(code))
  html = html.replace(/{{\s*appName\s*}}/g, appName)
  html = html.replace(/{{\s*supportUrl\s*}}/g, supportUrl)
  html = html.replace(/{{\s*supportEmail\s*}}/g, supportEmail)
  html = html.replace(/{{\s*title\s*}}/g, title)
  html = html.replace(/{{\s*footer\s*}}/g, footerTemplate)

  // For plain text, prefer the i18n 'text_body' if present so the body can be localized fully.
  const i18nTextBody = t('text_body', locale)
  const textSource = i18nTextBody && i18nTextBody.length > 0 ? i18nTextBody : textTpl

  let text = textSource.replace(/{{\s*code\s*}}/g, String(code))
  text = text.replace(/{{\s*appName\s*}}/g, appName)
  text = text.replace(/{{\s*supportUrl\s*}}/g, supportUrl)
  text = text.replace(/{{\s*supportEmail\s*}}/g, supportEmail)
  text = text.replace(/{{\s*title\s*}}/g, title)
  text = text.replace(/{{\s*footer\s*}}/g, footerTemplate)
  return { html, text }
}

const emailTemplates = { renderResetCode }
export default emailTemplates
