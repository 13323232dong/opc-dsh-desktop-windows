window.__ModuleLoader__.load({
  id: 'dsh-desktop-client-ui',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')
    const PRODUCT_NAME = 'Evan超级管家'
    const EVAN_LOGO_URL = '/dsh-desktop-evan-logo.svg'

    // The base desktop shell owns the product mark. The optional OPC brand
    // plugin can extend the product, but a plugin-load failure must not expose
    // upstream DeepSeek branding to the merchant.
    function DesktopBrandMark({ size = 24, className } = {}) {
      return React.createElement('img', {
        src: EVAN_LOGO_URL,
        alt: PRODUCT_NAME,
        className,
        width: size,
        height: size,
        style: { borderRadius: Math.max(5, Math.round(size * 0.28)) }
      })
    }

    function DesktopBrandName() {
      return React.createElement('span', null, PRODUCT_NAME)
    }

    function ConversationBrandMark(props) {
      return DesktopBrandMark(props)
    }

    const inject = ['slots']
    function apply(ctx) {
      ctx.slots.inject('sidebar.brand.mark', () =>
        ctx.slots.inject('sidebar.brand.name', () =>
          ctx.slots.inject('conversation.hero.brand.mark', function* () {
            yield ctx.slots.register({ name: 'sidebar.brand.mark' }, DesktopBrandMark)
            yield ctx.slots.register({ name: 'sidebar.brand.name' }, DesktopBrandName)
            yield ctx.slots.register(
              { name: 'conversation.hero.brand.mark' },
              ConversationBrandMark
            )
          })
        )
      )
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  }
})
