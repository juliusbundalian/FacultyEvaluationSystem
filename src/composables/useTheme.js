import { ref, provide } from 'vue'

export function useThemeProvider() {
  const currentTheme = ref('light')

  function setTheme(newTheme) {
    localStorage.setItem('theme', newTheme)
    currentTheme.value = newTheme

    let link = document.getElementById('theme-link')
    if (!link) {
      link = document.createElement('link')
      link.id = 'theme-link'
      link.rel = 'stylesheet'
      document.head.appendChild(link)
    }

    link.href = newTheme === 'light' ? '/theme-light.css' : '/theme-dark.css'
  }

  // Initialize theme
  const saved = localStorage.getItem('theme')
  if (saved) {
    setTheme(saved)
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    setTheme('dark')
  } else {
    setTheme('light')
  }

  // Provide globally
  provide('setTheme', setTheme)
  provide('currentTheme', currentTheme)
}