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

    function isManualToolCharge(item) {
      const actionId = item?.billingContext?.actionId
      return Boolean(actionId && !String(actionId).startsWith('model:'))
    }

    function manualChargeSummary(items) {
      return items.reduce((summary, item) => ({
        chargedCreditMicros: summary.chargedCreditMicros + BigInt(item.chargedCreditMicros || '0'),
        reservedCreditMicros: summary.reservedCreditMicros + BigInt(item.reservedCreditMicros || '0'),
        refundedCreditMicros: summary.refundedCreditMicros + BigInt(item.refundedCreditMicros || '0')
      }), { chargedCreditMicros: 0n, reservedCreditMicros: 0n, refundedCreditMicros: 0n })
    }

    function chargeByAction(items) {
      const charges = new Map()
      for (const item of items || []) {
        const actionId = item?.billingContext?.actionId
        if (!actionId) continue
        const previous = charges.get(actionId) || { chargedCreditMicros: 0n, reservedCreditMicros: 0n, refundedCreditMicros: 0n }
        charges.set(actionId, {
          chargedCreditMicros: previous.chargedCreditMicros + BigInt(item.chargedCreditMicros || '0'),
          reservedCreditMicros: previous.reservedCreditMicros + BigInt(item.reservedCreditMicros || '0'),
          refundedCreditMicros: previous.refundedCreditMicros + BigInt(item.refundedCreditMicros || '0')
        })
      }
      return charges
    }

    // Every visible trajectory cell shares the same conversation-level read.
    // This avoids issuing one billing request for every timeline row.
    const trajectoryChargeCache = new Map()
    function useTrajectoryCharges(conversationId, revision) {
      const [charges, setCharges] = React.useState(() => trajectoryChargeCache.get(conversationId)?.charges || new Map())
      React.useEffect(() => {
        if (!conversationId || !window.dshDesktopCredits?.chargeDetails) return
        const cached = trajectoryChargeCache.get(conversationId)
        if (cached?.revision === revision) {
          setCharges(cached.charges)
          return
        }
        let disposed = false
        const pending = cached?.pending || window.dshDesktopCredits.chargeDetails({ conversationId, sort: 'time', limit: 100 })
        trajectoryChargeCache.set(conversationId, { ...cached, pending })
        pending.then(result => {
          const next = chargeByAction(result.items)
          trajectoryChargeCache.set(conversationId, { revision, charges: next })
          if (!disposed) setCharges(next)
        }).catch(() => {
          if (!disposed) setCharges(new Map())
        })
        return () => { disposed = true }
      }, [conversationId, revision])
      return charges
    }

    function TrajectoryRowCharge({ conversationId, actionId, revision }) {
      const charge = useTrajectoryCharges(conversationId, revision).get(actionId)
      return React.createElement('span', {
        'aria-label': '扣费',
        style: { display: 'inline-block', minWidth: 78, marginLeft: 10, textAlign: 'right', fontVariantNumeric: 'tabular-nums', opacity: .78 }
      }, `扣费 ${formatCreditMicros(charge?.chargedCreditMicros || '0')}`)
    }

    function TrajectoryDetailCharge({ conversationId, actionId, revision }) {
      const charge = useTrajectoryCharges(conversationId, revision).get(actionId)
      const h = React.createElement
      return h('div', { 'aria-label': '扣费', style: { display: 'grid', gap: 3, padding: '10px 0', borderTop: '1px solid rgba(128,128,128,.18)' } },
        h('strong', null, '扣费'),
        h('span', null, `实扣：${formatCreditMicros(charge?.chargedCreditMicros || '0')}`),
        h('span', null, `预扣：${formatCreditMicros(charge?.reservedCreditMicros || '0')}`),
        h('span', null, `退款：${formatCreditMicros(charge?.refundedCreditMicros || '0')}`)
      )
    }

    function ToolChargeView() {
      const h = React.createElement
      const [data, setData] = React.useState(null)
      const [sort, setSort] = React.useState('time')
      const [loading, setLoading] = React.useState(true)
      const [error, setError] = React.useState('')
      const [refresh, setRefresh] = React.useState(0)
      React.useEffect(() => {
        let disposed = false
        setLoading(true)
        setError('')
        if (!window.dshDesktopCredits?.chargeDetails) {
          setError('当前版本不支持读取工具扣费，请更新桌面端')
          setLoading(false)
          return () => { disposed = true }
        }
        window.dshDesktopCredits.chargeDetails({ sort, limit: 100 })
          .then(result => {
            if (disposed) return
            const items = (result.items || []).filter(isManualToolCharge)
            setData({ items, summary: manualChargeSummary(items) })
          })
          .catch(failure => {
            if (!disposed) setError(failure instanceof Error ? failure.message : '读取工具扣费失败，请重试')
          })
          .finally(() => { if (!disposed) setLoading(false) })
        return () => { disposed = true }
      }, [sort, refresh])
      const metric = (label, value) => h('div', { key: label, style: { minWidth: 120 } }, h('div', { style: { fontSize: 12, opacity: .65 } }, label), h('strong', null, formatCreditMicros(value)))
      return h('main', { 'aria-label': '工具扣费', style: { padding: 20, overflow: 'auto', height: '100%' } },
        h('header', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' } },
          h('div', null, h('h2', { style: { margin: 0 } }, '工具扣费'), h('p', { style: { margin: '6px 0', opacity: .68 } }, '只显示手动执行的工具和任务动作；对话模型调用不在这里重复计算。')),
          h('label', null, '排序 ', h('select', { value: sort, onChange: event => setSort(event.target.value) }, h('option', { value: 'time' }, '按时间'), h('option', { value: 'amount' }, '扣费从高到低')))
        ),
        data && h('section', { 'aria-label': '工具扣费汇总', style: { display: 'flex', gap: 28, flexWrap: 'wrap', padding: '16px 0', borderBottom: '1px solid rgba(128,128,128,.2)' } }, metric('累计实扣', data.summary.chargedCreditMicros), metric('处理中预扣', data.summary.reservedCreditMicros), metric('已退回积分', data.summary.refundedCreditMicros)),
        loading && h('p', { role: 'status' }, '正在读取'),
        error && h('div', { role: 'alert' }, error, ' ', h('button', { type: 'button', onClick: () => setRefresh(value => value + 1) }, '重试')),
        !loading && !error && data?.items.length === 0 && h('p', null, '暂无手动工具扣费记录'),
        !loading && !error && data?.items.length > 0 && h('table', { style: { width: '100%', borderCollapse: 'collapse', marginTop: 16, textAlign: 'left' } },
          h('thead', null, h('tr', null, ...['操作', '所属任务', '服务/模型', '实扣', '状态', '时间'].map(label => h('th', { key: label, style: { padding: '10px 8px', borderBottom: '1px solid rgba(128,128,128,.25)', fontSize: 13 } }, label)))),
          h('tbody', null, ...data.items.map(item => h('tr', { key: item.id },
            h('td', { style: { padding: '10px 8px', borderBottom: '1px solid rgba(128,128,128,.12)' } }, h('details', null, h('summary', null, item.actionName || '工具操作'), h('div', { style: { marginTop: 8, fontSize: 12, opacity: .75 } }, `预扣：${formatCreditMicros(item.reservedCreditMicros)}；退款：${formatCreditMicros(item.refundedCreditMicros)}`, h('br'), `计费用量：${Object.keys(item.usage || {}).length ? JSON.stringify(item.usage) : '未记录'}`, h('br'), `当时计价：${Object.keys(item.pricing || {}).length ? JSON.stringify(item.pricing) : '未记录'}`))),
            h('td', { style: { padding: '10px 8px', borderBottom: '1px solid rgba(128,128,128,.12)' } }, item.billingContext?.taskId || '当前对话'),
            h('td', { style: { padding: '10px 8px', borderBottom: '1px solid rgba(128,128,128,.12)' } }, [item.provider, item.model].filter(Boolean).join(' / ') || '平台服务'),
            h('td', { style: { padding: '10px 8px', borderBottom: '1px solid rgba(128,128,128,.12)', fontVariantNumeric: 'tabular-nums' } }, formatCreditMicros(item.chargedCreditMicros)),
            h('td', { style: { padding: '10px 8px', borderBottom: '1px solid rgba(128,128,128,.12)' } }, chargeStatus(item)),
            h('td', { style: { padding: '10px 8px', borderBottom: '1px solid rgba(128,128,128,.12)', whiteSpace: 'nowrap' } }, new Date(item.createdAt).toLocaleString('zh-CN'))
          )))
        )
      )
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
      ctx.slots.inject('conversation.view', () => ctx.slots.register({ name: 'conversation.view', id: 'tool-charges', order: 25, label: '工具扣费' }, ToolChargeView))
      ctx.slots.inject('conversation.trajectory.charges', () => ctx.slots.register({ name: 'conversation.trajectory.charges' }, ChargeDetails))
      ctx.slots.inject('conversation.trajectory.row-charge', () => ctx.slots.register({ name: 'conversation.trajectory.row-charge' }, TrajectoryRowCharge))
      ctx.slots.inject('conversation.trajectory.detail-charge', () => ctx.slots.register({ name: 'conversation.trajectory.detail-charge' }, TrajectoryDetailCharge))
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
    exports.isManualToolCharge = isManualToolCharge
    exports.manualChargeSummary = manualChargeSummary
    exports.chargeByAction = chargeByAction
    return module.exports
  }
})
