import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const html = readFileSync(join(process.cwd(), 'build', 'login.html'), 'utf8')
const pageScript = html.match(/<script>([\s\S]*?)<\/script>/)?.[1]

class FakeElement {
  id = ''
  value = ''
  textContent = ''
  disabled = false
  checked = false
  hidden = false
  type = ''
  title = ''
  isConnected = true
  autocomplete = ''
  className = ''
  style = { color: '' }
  parentElement: FakeElement | null = null
  children: FakeElement[] = []
  classList = { toggle: (_name: string, _force?: boolean) => false }
  private listeners = new Map<string, Array<(event: { preventDefault(): void }) => unknown>>()

  constructor(private readonly document: FakeDocument) {}

  set innerHTML(value: string) {
    for (const match of value.matchAll(/<(input|button)[^>]*id="([^"]+)"[^>]*>([^<]*)/g)) {
      const child = this.document.createElement(match[1]!)
      child.setId(match[2]!)
      child.textContent = match[3] ?? ''
      child.parentElement = this
      this.children.push(child)
    }
  }

  setId(id: string): void {
    this.id = id
    this.document.register(this)
  }

  addEventListener(type: string, listener: (event: { preventDefault(): void }) => unknown): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener])
  }

  async dispatch(type: string): Promise<void> {
    const event = { preventDefault: () => undefined }
    await Promise.all((this.listeners.get(type) ?? []).map((listener) => listener(event)))
  }

  after(_element: FakeElement): void {}

  closest(selector: string): FakeElement | null {
    if (selector !== 'label') return null
    return this.parentElement
  }

  focus(): void {}

  setAttribute(name: string, value: string): void {
    if (name === 'id') this.setId(value)
    else if (name === 'aria-label') return
    else (this as unknown as Record<string, unknown>)[name] = value
  }

  removeAttribute(name: string): void {
    delete (this as unknown as Record<string, unknown>)[name]
  }

  replaceChildren(...elements: FakeElement[]): void {
    this.children = [...elements]
  }

  remove(): void {
    this.isConnected = false
    this.document.unregister(this)
    for (const child of this.children) child.remove()
  }
}

class FakeDocument {
  private readonly elements = new Map<string, FakeElement>()
  readonly heading = this.createElement('h1')
  readonly formParagraph = this.createElement('p')

  createElement(_tagName: string): FakeElement {
    return new FakeElement(this)
  }

  register(element: FakeElement): void {
    this.elements.set(element.id, element)
  }

  unregister(element: FakeElement): void {
    if (this.elements.get(element.id) === element) this.elements.delete(element.id)
  }

  getElementById(id: string): FakeElement | null {
    return this.elements.get(id) ?? null
  }

  querySelector(selector: string): FakeElement | null {
    if (selector === 'h1') return this.heading
    if (selector === 'form p') return this.formParagraph
    return null
  }

  addInitialElement(id: string, parent?: FakeElement): FakeElement {
    const element = this.createElement('div')
    element.setId(id)
    element.parentElement = parent ?? null
    return element
  }
}

function deferred<T = void>(): { promise: Promise<T>; resolve(value: T): void; reject(error: Error): void } {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function createPage(
  requestRegistrationCode: () => Promise<void>,
  authOverrides: Partial<{
    listSavedLogins: () => Promise<Array<{ username: string; hasPassword: boolean }>>
    loadSavedPassword: (username: string) => Promise<string | undefined>
    clearSavedPassword: (username: string) => Promise<{ ok: boolean }>
  }> = {}
) {
  if (!pageScript) throw new Error('login page script is missing')
  const document = new FakeDocument()
  const form = document.addInitialElement('login')
  document.addInitialElement('notice', form)
  document.addInitialElement('submit', form)
  document.addInitialElement('register', form)
  document.addInitialElement('account-history', form)
  document.addInitialElement('remember-row', form)
  const rememberPassword = document.addInitialElement('remember-password', form)
  rememberPassword.checked = false
  document.addInitialElement('clear-saved-password', form)
  document.addInitialElement('toggle-password', form)
  const usernameLabel = document.createElement('label')
  document.addInitialElement('username', usernameLabel)
  const passwordLabel = document.createElement('label')
  document.addInitialElement('password', passwordLabel)

  let now = 1_000_000
  let nextTimerId = 1
  const timers = new Map<number, () => void>()
  const confirmRegistration = vi.fn(async () => undefined)
  const desktopAuth = {
    requestRegistrationCode,
    confirmRegistration,
    signIn: vi.fn(async () => undefined),
    listSavedLogins: vi.fn(async () => [] as Array<{ username: string; hasPassword: boolean }>),
    loadSavedPassword: vi.fn(async () => undefined as string | undefined),
    clearSavedPassword: vi.fn(async () => ({ ok: true })),
    ...authOverrides
  }
  const window = {
    dshDesktopAuth: {
      ...desktopAuth
    },
    setInterval: (callback: () => void) => {
      const id = nextTimerId++
      timers.set(id, callback)
      return id
    },
    clearInterval: (id: number) => timers.delete(id)
  }

  runInNewContext(pageScript, {
    document,
    desktopAuth,
    window,
    location: { search: '' },
    URLSearchParams,
    Date: { now: () => now }
  })

  return {
    document,
    desktopAuth,
    confirmRegistration,
    timerCount: () => timers.size,
    advance(milliseconds: number) {
      now += milliseconds
      for (const callback of [...timers.values()]) callback()
    },
    async click(id: string): Promise<void> {
      const element = document.getElementById(id)
      if (!element) throw new Error(`missing element: ${id}`)
      await element.dispatch('click')
    },
    async submit(): Promise<void> {
      await form.dispatch('submit')
    }
  }
}

async function openRegistration(page: ReturnType<typeof createPage>): Promise<void> {
  await page.click('register')
  page.document.getElementById('username')!.value = 'merchant-test'
  page.document.getElementById('password')!.value = '12345678'
  page.document.getElementById('email-value')!.value = 'merchant@example.com'
}

describe('registration verification-code countdown', () => {
  it('counts down from 60 seconds after a successful request and restores the button at expiry', async () => {
    const page = createPage(async () => undefined)
    await openRegistration(page)

    await page.click('send-code')
    const button = page.document.getElementById('send-code')!
    expect(button.disabled).toBe(true)
    expect(button.textContent).toBe('重新获取（60s）')

    page.advance(1_000)
    expect(button.textContent).toBe('重新获取（59s）')
    page.advance(59_000)
    expect(button.disabled).toBe(false)
    expect(button.textContent).toBe('获取验证码')
    expect(page.timerCount()).toBe(0)
  })

  it('restores the button without starting a timer when the request fails', async () => {
    const page = createPage(async () => { throw new Error('request failed') })
    await openRegistration(page)

    await page.click('send-code')

    const button = page.document.getElementById('send-code')!
    expect(button.disabled).toBe(false)
    expect(button.textContent).toBe('获取验证码')
    expect(page.timerCount()).toBe(0)
  })

  it('ignores a stale request that resolves after leaving the registration page', async () => {
    const request = deferred()
    const page = createPage(() => request.promise)
    await openRegistration(page)
    const pendingRequest = page.click('send-code')

    await page.click('register')
    await page.click('register')
    request.resolve()
    await pendingRequest

    const currentButton = page.document.getElementById('send-code')!
    expect(currentButton.disabled).toBe(false)
    expect(currentButton.textContent).toBe('获取验证码')
    expect(page.timerCount()).toBe(0)

    page.document.getElementById('confirmation-value')!.value = '12345678'
    page.document.getElementById('code-value')!.value = '123456'
    await page.submit()
    expect(page.confirmRegistration).not.toHaveBeenCalled()
  })
})

describe('saved password hydration', () => {
  it('does not overwrite a password typed while an older saved-password request is pending', async () => {
    const savedPassword = deferred<string | undefined>()
    const page = createPage(async () => undefined, {
      listSavedLogins: vi.fn(async () => [{ username: 'test7', hasPassword: true }]),
      loadSavedPassword: vi.fn(async () => await savedPassword.promise)
    })
    await vi.waitFor(() => expect(page.desktopAuth.loadSavedPassword).toHaveBeenCalledWith('test7'))
    const password = page.document.getElementById('password')!
    password.value = 'new-manual-password'
    await password.dispatch('input')

    savedPassword.resolve('old-saved-password')
    await vi.waitFor(() => expect(password.value).toBe('new-manual-password'))
  })
})
