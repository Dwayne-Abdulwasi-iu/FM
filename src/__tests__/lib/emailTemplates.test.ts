import { renderResetCode } from '@/lib/emailTemplates'

describe('renderResetCode', () => {
  it('renders html and text with provided code and default (en) locale', () => {
    const { html, text } = renderResetCode('654321', {
      appName: 'TestApp',
      supportUrl: 'https://help.example.com',
      supportEmail: 'help@example.com',
      locale: 'en'
    })

    expect(html).toContain('654321')
    expect(text).toContain('654321')
    expect(html).toContain('Password reset code')
    expect(text).toContain('Your password reset code')
    expect(html).toContain('https://help.example.com')
    expect(html).toContain('help@example.com')
  })

  it('renders localized (es) title and footer', () => {
    const { html, text } = renderResetCode('000111', {
      appName: 'MiApp',
      supportUrl: 'https://ayuda.example.com',
      supportEmail: 'ayuda@example.com',
      locale: 'es'
    })

    expect(html).toContain('000111')
    expect(html).toContain('Código de restablecimiento de contraseña')
    expect(html).toContain('https://ayuda.example.com')
    expect(html).toContain('ayuda@example.com')
    expect(text).toContain('Su código de restablecimiento es')
  })
})
