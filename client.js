window.__ModuleLoader__.load({
  id: 'dsh-mobile-boost',
  factory(require) {
    /**
     * Narrow-screen boost for the DSH Web UI.
     *
     * One injected stylesheet + one focus handler. Nothing else: no routes, no
     * services, no React tree. That is on purpose — the WebView that opens this
     * page on a phone has to survive it, and a plugin that only ever adds CSS
     * and a passive listener cannot take the page down with it.
     *
     * Scope: `(max-width: 1023px) and (pointer: coarse)`. Mouse-driven desktop
     * windows never match, so this is a complete no-op there even at narrow
     * widths — the same gate `dsh-web-mobile` uses, so the two stack instead of
     * fighting over which one "owns" the mobile layout.
     *
     * Opt out per device: open the page with `?mb=off` (sticky), `?mb=on` to
     * clear it. Also `window.__DSH_MOBILE_BOOST__` on the console.
     */

    const MOBILE_QUERY = '(max-width: 1023px) and (pointer: coarse)'
    const STYLE_ID = 'dsh-mobile-boost-style'
    const ROOT_CLASS = 'mb-on'
    const FLAG_KEY = 'dsh-mobile-boost'

    /**
     * Everything is scoped under `html.mb-on`, so an install that never matches
     * the query changes nothing at all. `!important` appears only where a
     * component sets its own value in a hashed CSS-module class we cannot name.
     */
    const CSS = `
:root { --mb-tap: 40px; }

html.mb-on {
  -webkit-text-size-adjust: 100% !important;
  text-size-adjust: 100% !important;
}

/* Readable body text: 16px keeps Chrome/Safari from zooming on field focus. */
html.mb-on body {
  font-size: 16px !important;
  line-height: 1.55 !important;
  overflow-x: hidden !important;
}
html.mb-on p,
html.mb-on li,
html.mb-on dd,
html.mb-on blockquote {
  font-size: 15.5px !important;
}

/* Touch targets. 40px is the size a fingertip actually hits. */
html.mb-on button,
html.mb-on [role="button"],
html.mb-on [role="menuitem"],
html.mb-on [role="tab"],
html.mb-on [role="option"] {
  min-height: var(--mb-tap) !important;
  min-width: var(--mb-tap) !important;
}
html.mb-on input,
html.mb-on select,
html.mb-on textarea {
  min-height: var(--mb-tap) !important;
}
/* Except inside code blocks, where a copy chip would otherwise inflate the line. */
html.mb-on pre button,
html.mb-on pre [role="button"],
html.mb-on code button {
  min-height: 0 !important;
  min-width: 0 !important;
}

/* A drawer may never cover the whole screen: leave a strip to tap back with. */
html.mb-on [class*="drawer"],
html.mb-on [class*="Drawer"],
html.mb-on aside {
  max-width: 86vw !important;
}

/* Media and wide tables may not push the page sideways. */
html.mb-on img,
html.mb-on video {
  max-width: 100% !important;
  height: auto !important;
}
html.mb-on table {
  display: block;
  max-width: 100% !important;
  overflow-x: auto;
}

/* The composer clears the gesture bar / safe area. */
html.mb-on textarea {
  padding-bottom: max(10px, env(safe-area-inset-bottom)) !important;
}

html.mb-on * {
  -webkit-tap-highlight-color: rgba(128, 128, 128, 0.18);
}
`

    /** Sticky per-device opt-out, set by `?mb=off`. */
    function readFlag() {
      try {
        return window.localStorage.getItem(FLAG_KEY)
      } catch {
        return null
      }
    }

    function writeFlag(value) {
      try {
        if (value === null) window.localStorage.removeItem(FLAG_KEY)
        else window.localStorage.setItem(FLAG_KEY, value)
      } catch {
        /* private mode / storage disabled: fall through to the default */
      }
    }

    /** Honour `?mb=off` / `?mb=on` in the URL, then forget the query string. */
    function applyOverride() {
      let params
      try {
        params = new URLSearchParams(window.location.search)
      } catch {
        return
      }
      if (!params.has('mb')) return
      const value = params.get('mb')
      writeFlag(value === 'off' ? 'off' : null)
      try {
        params.delete('mb')
        const query = params.toString()
        window.history.replaceState(null, '', window.location.pathname + (query ? `?${query}` : '') + window.location.hash)
      } catch {
        /* history is a nicety here; the flag is already stored */
      }
    }

    /**
     * After the soft keyboard opens, a focused field can sit under it. Centring
     * the field ~320ms later lands it in the visible half on every browser we
     * know of, without needing to know which container scrolls.
     */
    function installFocusGuard(matches) {
      let timer = 0
      const onFocusIn = (event) => {
        if (!matches()) return
        const target = event.target
        if (!target || typeof target.tagName !== 'string') return
        const isField =
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable === true
        if (!isField) return
        window.clearTimeout(timer)
        timer = window.setTimeout(() => {
          try {
            target.scrollIntoView({ block: 'center', behavior: 'smooth' })
          } catch {
            try {
              target.scrollIntoView()
            } catch {
              /* detached node: nothing to do */
            }
          }
        }, 320)
      }
      const onFocusOut = () => window.clearTimeout(timer)
      document.addEventListener('focusin', onFocusIn, true)
      document.addEventListener('focusout', onFocusOut, true)
      return () => {
        window.clearTimeout(timer)
        document.removeEventListener('focusin', onFocusIn, true)
        document.removeEventListener('focusout', onFocusOut, true)
      }
    }

    /** `ctx.effect` runs this on load and on the returned disposer at unload. */
    function install(ctx) {
      applyOverride()
      const media = window.matchMedia(MOBILE_QUERY)
      const enabled = () => readFlag() !== 'off'
      const matches = () => enabled() && media.matches

      const style = document.createElement('style')
      style.id = STYLE_ID
      style.textContent = CSS
      document.head.appendChild(style)

      const sync = () => {
        document.documentElement.classList.toggle(ROOT_CLASS, matches())
      }
      sync()

      const onMediaChange = () => sync()
      if (typeof media.addEventListener === 'function') media.addEventListener('change', onMediaChange)
      else if (typeof media.addListener === 'function') media.addListener(onMediaChange)

      const removeFocusGuard = installFocusGuard(matches)

      /** Console switch: `__DSH_MOBILE_BOOST__.setEnabled(false)` turns it off. */
      window.__DSH_MOBILE_BOOST__ = {
        version: '1.0.0',
        query: MOBILE_QUERY,
        matches: () => media.matches,
        enabled,
        active: matches,
        setEnabled(value) {
          writeFlag(value === false ? 'off' : null)
          sync()
          return matches()
        },
      }

      if (typeof ctx !== 'undefined' && ctx && typeof ctx.logger === 'object' && ctx.logger) {
        try {
          ctx.logger.info(`dsh-mobile-boost: installed (${matches() ? 'active' : 'idle'}, ${media.matches ? 'media matched' : 'media idle'})`)
        } catch {
          /* logging is never worth failing a plugin load over */
        }
      }

      return () => {
        removeFocusGuard()
        if (typeof media.removeEventListener === 'function') media.removeEventListener('change', onMediaChange)
        else if (typeof media.removeListener === 'function') media.removeListener(onMediaChange)
        document.documentElement.classList.remove(ROOT_CLASS)
        if (style.parentNode) style.parentNode.removeChild(style)
        try {
          delete window.__DSH_MOBILE_BOOST__
        } catch {
          window.__DSH_MOBILE_BOOST__ = undefined
        }
      }
    }

    return {
      apply(ctx) {
        ctx.effect(() => install(ctx), 'dsh-mobile-boost: narrow-screen stylesheet + focus guard')
      },
    }
  },
})
