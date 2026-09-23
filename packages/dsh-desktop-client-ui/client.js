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

    function formatCreditMicros(value) {
      const amount = BigInt(value || '0')
      if (amount > 0n && amount < 100n) return '<0.0001 积分'
      const fraction = (amount % 1000000n).toString().padStart(6, '0').slice(0, 4).replace(/0+$/, '')
      return `${amount / 1000000n}${fraction ? `.${fraction}` : ''} 积分`
    }

    function chargeStatus(item) {
      if (item.billingMode === 'byok' || item.billingMode === 'external') return '平台未扣积分，费用由服务商结算'
      return ({ pending: '处理中预扣', reserved: '处理中预扣', settlement_pending: '结算处理中', succeeded: '已结算', charged: '已结算', settled: '已结算', released: '已释放', failed: '调用失败', refunded: '已退款', partially_refunded: '部分退款' })[item.status] || '状态待确认'
    }

    function ChargeDetails({ conversationId, revision, navigateToAction, canNavigateToAction }) {
      const h = React.createElement
      const [open, setOpen] = React.useState(false)
      const [sort, setSort] = React.useState('time')
      const [storedData, setData] = React.useState(null)
      const data = storedData?.conversationId === conversationId && storedData?.sort === sort ? storedData : null
      const [error, setError] = React.useState('')
      const [loading, setLoading] = React.useState(false)
      const [refresh, setRefresh] = React.useState(0)
      const generation = React.useRef(0)
      const request = React.useRef(null)
      React.useEffect(() => {
        const current = ++generation.current
        setData(null)
        setError('')
        if (!open || !conversationId) return
        let timer
        let disposed = false
        let serial = 0
        const read = async (cursor) => {
          const requestSerial = ++serial
          setLoading(true)
          setError('')
          try {
            if (!window.dshDesktopCredits?.chargeDetails) throw new Error('当前版本不支持读取扣费明细，请更新桌面端')
            const result = await window.dshDesktopCredits.chargeDetails({ conversationId, sort, limit: 50, ...(cursor ? { cursor } : {}) })
            if (disposed || generation.current !== current || requestSerial !== serial) return
            setData(previous => ({ ...result, conversationId, sort, items: cursor && previous ? [...previous.items, ...result.items.filter(item => !previous.items.some(old => old.id === item.id))] : result.items }))
            clearTimeout(timer)
            if (BigInt(result.summary.reservedCreditMicros) > 0n) timer = setTimeout(() => read(), 5000)
          } catch (failure) {
            if (!disposed && generation.current === current && requestSerial === serial) setError(failure instanceof Error ? failure.message : '读取扣费明细失败，请重试')
          } finally {
            if (!disposed && generation.current === current && requestSerial === serial) setLoading(false)
          }
        }
        request.current = read
        read()
        const settled = () => read()
        window.addEventListener('dsh:charge-settled', settled)
        return () => { disposed = true; clearTimeout(timer); request.current = null; window.removeEventListener('dsh:charge-settled', settled) }
      }, [open, conversationId, sort, refresh, revision])
      const metric = (label, value) => h('div', { key: label }, h('div', { style: { opacity: .65, fontSize: 12 } }, label), h('strong', null, formatCreditMicros(value)))
      const labels = { lineItems: '分项明细', provider: '服务商', model: '模型', toolId: '工具', usage: '计费用量', pricing: '当时计价', inputTokens: '输入 token', outputTokens: '输出 token', cachedTokens: '缓存命中 token', cacheHitInputTokens: '缓存命中 token', cacheMissInputTokens: '未命中缓存 token', audioSeconds: '音频秒数', seconds: '秒数', imageCount: '图片张数', priceVersion: '计价版本', version: '计价版本', currency: '币种', cacheHitNanoCnyPerMillion: '缓存命中单价（纳元/百万 token）', cacheMissNanoCnyPerMillion: '缓存未命中单价（纳元/百万 token）', outputNanoCnyPerMillion: '输出单价（纳元/百万 token）', costNanoCny: '人民币费用（纳元）', inputPriceMicros: '输入计价系数', outputPriceMicros: '输出计价系数', cachedPriceMicros: '缓存计价系数', chargedCreditMicros: '实扣（微积分）', computePoints: '实扣积分' }
      const evidenceValue = value => {
        if (value === null) return '未记录'
        if (Array.isArray(value)) return h('ol', null, ...value.map((item, index) => h('li', { key: index, style: { marginBottom: 8 } }, evidenceValue(item))))
        if (typeof value === 'object') return h('dl', { style: { margin: '6px 0 6px 12px' } }, ...Object.entries(value).map(([key, item]) => h('div', { key }, h('dt', { style: { display: 'inline' } }, `${labels[key] || key}：`), h('dd', { style: { display: 'inline', margin: 0 } }, evidenceValue(item)))))
        return value === 'legacy-unavailable' ? '历史计价未记录' : String(value)
      }
      const evidence = (title, values) => h('section', null, h('strong', null, title), Object.keys(values || {}).length ? evidenceValue(values) : h('p', null, '未记录'))
      return h('section', { 'aria-label': '扣费明细', style: { padding: '10px 16px', borderBottom: '1px solid rgba(128,128,128,.2)', flexShrink: 0, maxHeight: '55vh', overflow: 'auto' } },
        h('button', { type: 'button', 'aria-expanded': open, onClick: () => setOpen(!open) }, `${open ? '▾' : '▸'} 扣费明细`),
        open && h('div', null,
          h('p', { style: { fontSize: 12, opacity: .65 } }, '当前对话及子任务 · 实扣已扣除退款，处理中预扣单独统计'),
          data && h('div', { style: { display: 'flex', gap: 24, flexWrap: 'wrap', margin: '12px 0' } }, metric('累计实扣', data.summary.chargedCreditMicros), metric('处理中预扣', data.summary.reservedCreditMicros), metric('已退回积分', data.summary.refundedCreditMicros)),
          h('label', null, '排序 ', h('select', { value: sort, onChange: event => setSort(event.target.value) }, h('option', { value: 'time' }, '按时间'), h('option', { value: 'amount' }, '扣费从高到低'))),
          loading && h('p', { role: 'status' }, '正在读取'),
          error && h('div', { role: 'alert' }, error, h('button', { type: 'button', onClick: () => setRefresh(value => value + 1) }, '重试')),
          !loading && !error && data?.items.length === 0 && h('p', null, '当前对话暂无可关联扣费记录'),
          ...(data?.items || []).map(item => h('details', { key: item.id, style: { padding: '10px 0', borderBottom: '1px solid rgba(128,128,128,.15)' } },
            h('summary', { style: { cursor: 'pointer' } }, `${new Date(item.createdAt).toLocaleString('zh-CN')} · ${item.actionName || item.billingContext?.actionName || '服务调用'} · ${item.agentId || item.billingContext?.agentId || '主智能体'} · ${[item.provider, item.model].filter(Boolean).join(' / ') || '平台服务'} · ${formatCreditMicros(item.chargedCreditMicros)} · ${chargeStatus(item)}`),
            evidence('计费用量', item.usage), evidence('当时单价与计价版本', item.pricing),
            h('p', null, `预扣：${formatCreditMicros(item.reservedCreditMicros)}；已退回：${formatCreditMicros(item.refundedCreditMicros)}`),
            item.association === 'legacy' ? h('p', null, '历史记录，无法定位动作') : h('button', { type: 'button', disabled: !canNavigateToAction?.(item.billingContext), onClick: () => navigateToAction?.(item.billingContext) }, canNavigateToAction?.(item.billingContext) ? '查看对应轨迹动作' : '对应轨迹动作不可用')
          )),
          data?.nextCursor && h('button', { type: 'button', disabled: loading, onClick: () => request.current?.(data.nextCursor) }, '加载更多')
        ))
    }

    const inject = ['slots']
    function apply(ctx) {
      ctx.slots.inject('conversation.trajectory.charges', () => ctx.slots.register({ name: 'conversation.trajectory.charges' }, ChargeDetails))
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
    exports.formatCreditMicros = formatCreditMicros
    exports.chargeStatus = chargeStatus
    return module.exports
  }
})
