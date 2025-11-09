type Translations = Record<string, Record<string, string>>

const translations: Translations = {
  en: {
    title: 'Password reset code',
    footer: "If you didn't request this, you can safely ignore this email. Need help? Visit {{supportUrl}} or email {{supportEmail}}.",
    text_body: 'Your password reset code is: {{code}}\n\nThis code expires in 10 minutes. If you did not request a password reset, you can ignore this email.\n\nThanks,\n{{appName}}'
  },
  es: {
    title: 'Código de restablecimiento de contraseña',
    footer: 'Si no solicitó esto, puede ignorar este correo. ¿Necesita ayuda? Visite {{supportUrl}} o escriba a {{supportEmail}}.',
    text_body: 'Su código de restablecimiento es: {{code}}\n\nEste código caduca en 10 minutos. Si no solicitó un restablecimiento, puede ignorar este correo.\n\nGracias,\n{{appName}}'
  }
}

export function t(key: string, locale = 'en') {
  const loc = translations[locale] || translations.en
  return loc[key] ?? translations.en[key] ?? ''
}

const i18n = { t }
export default i18n
