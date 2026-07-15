import { useEffect, useState, useMemo } from 'react'
import PropTypes from 'prop-types'
import ThemeContext from '@/contexts/themeContextCore'

function readStorage(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback
  } catch {
    return fallback
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* private browsing */
  }
}

export default function ThemeProvider({ children }) {
  // Theme switching is a dev-only tool. In production the site is locked to
  // gold regardless of any theme previously saved to localStorage.
  const [theme, setTheme] = useState(() =>
    import.meta.env.DEV ? readStorage('iwd-theme', 'gold') : 'gold'
  )
  const mode = 'dark'

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    writeStorage('iwd-theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-mode', 'dark')
    writeStorage('iwd-mode', 'dark')
  }, [])

  const value = useMemo(() => ({ theme, setTheme, mode }), [theme, mode])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
}
