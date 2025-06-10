// Accessibility utilities and helpers
export class AccessibilityManager {
  private focusHistory: HTMLElement[] = []
  private announcements = new Map<string, HTMLElement>()
  private keyboardTrapStack: HTMLElement[] = []

  constructor() {
    this.initializeA11y()
  }

  private initializeA11y() {
    // Create live regions for announcements
    this.createLiveRegions()
    
    // Enhanced keyboard navigation
    this.setupKeyboardNavigation()
    
    // Focus management
    this.setupFocusManagement()
    
    // High contrast detection
    this.detectHighContrast()
    
    // Reduced motion detection
    this.detectReducedMotion()
    
    // Screen reader detection
    this.detectScreenReader()
  }

  private createLiveRegions() {
    // Polite announcements (non-interrupting)
    const politeRegion = document.createElement('div')
    politeRegion.setAttribute('aria-live', 'polite')
    politeRegion.setAttribute('aria-atomic', 'true')
    politeRegion.setAttribute('aria-relevant', 'additions text')
    politeRegion.className = 'sr-only'
    politeRegion.id = 'a11y-announce-polite'
    document.body.appendChild(politeRegion)
    this.announcements.set('polite', politeRegion)

    // Assertive announcements (interrupting)
    const assertiveRegion = document.createElement('div')
    assertiveRegion.setAttribute('aria-live', 'assertive')
    assertiveRegion.setAttribute('aria-atomic', 'true')
    assertiveRegion.className = 'sr-only'
    assertiveRegion.id = 'a11y-announce-assertive'
    document.body.appendChild(assertiveRegion)
    this.announcements.set('assertive', assertiveRegion)

    // Status announcements
    const statusRegion = document.createElement('div')
    statusRegion.setAttribute('role', 'status')
    statusRegion.setAttribute('aria-live', 'polite')
    statusRegion.className = 'sr-only'
    statusRegion.id = 'a11y-announce-status'
    document.body.appendChild(statusRegion)
    this.announcements.set('status', statusRegion)
  }

  // Screen reader announcements
  announce(message: string, priority: 'polite' | 'assertive' | 'status' = 'polite') {
    const region = this.announcements.get(priority)
    if (region) {
      region.textContent = message
      // Clear after announcement to allow repeated messages
      setTimeout(() => {
        region.textContent = ''
      }, 1000)
    }
  }

  // Focus management with history
  setFocus(element: HTMLElement | string, options: { preventScroll?: boolean } = {}) {
    const target = typeof element === 'string' ? document.querySelector(element) as HTMLElement : element
    
    if (target) {
      // Store previous focus for restoration
      const currentFocus = document.activeElement as HTMLElement
      if (currentFocus && currentFocus !== target) {
        this.focusHistory.push(currentFocus)
      }

      target.focus(options)
      
      // Announce focus change to screen readers
      const label = target.getAttribute('aria-label') || target.textContent || 'Element'
      this.announce(`Focused on ${label}`)
    }
  }

  // Restore previous focus
  restoreFocus() {
    const lastFocused = this.focusHistory[this.focusHistory.length - 2]
    if (lastFocused && document.contains(lastFocused)) {
      lastFocused.focus()
    }
  }

  // Enhanced keyboard navigation
  private setupKeyboardNavigation() {
    // Enhanced tab navigation
    document.addEventListener('keydown', (e) => {
      // Skip links with S key
      if (e.key === 's' && e.altKey) {
        e.preventDefault()
        this.showSkipLinks()
      }

      // Focus trap management
      if (e.key === 'Tab') {
        this.handleTabNavigation(e)
      }

      // Escape key handling
      if (e.key === 'Escape') {
        this.handleEscapeKey(e)
      }

      // Arrow key navigation for custom components
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        this.handleArrowNavigation(e)
      }
    })

    // Focus indicators
    document.addEventListener('focusin', (e) => {
      this.enhanceFocusIndicator(e.target as HTMLElement)
    })

    document.addEventListener('focusout', (e) => {
      this.removeFocusIndicator(e.target as HTMLElement)
    })
  }

  private handleEscapeKey(e: KeyboardEvent) {
    // Close modals, dropdowns, etc.
    const activeModal = document.querySelector('[role="dialog"][aria-hidden="false"]')
    if (activeModal) {
      const closeButton = activeModal.querySelector('[data-dismiss="modal"]') as HTMLElement
      closeButton?.click()
    }

    // Close expanded dropdowns
    const expandedDropdowns = document.querySelectorAll('[aria-expanded="true"]')
    expandedDropdowns.forEach(dropdown => {
      (dropdown as HTMLElement).click()
    })
  }

  private showSkipLinks() {
    const skipLinks = document.querySelectorAll('.skip-link')
    skipLinks.forEach(link => {
      (link as HTMLElement).classList.add('visible')
    })
  }

  private handleTabNavigation(e: KeyboardEvent) {
    const currentTrap = this.keyboardTrapStack[this.keyboardTrapStack.length - 1]
    if (currentTrap) {
      const focusableElements = this.getFocusableElements(currentTrap)
      const firstFocusable = focusableElements[0]
      const lastFocusable = focusableElements[focusableElements.length - 1]

      if (e.shiftKey && document.activeElement === firstFocusable) {
        e.preventDefault()
        lastFocusable?.focus()
      } else if (!e.shiftKey && document.activeElement === lastFocusable) {
        e.preventDefault()
        firstFocusable?.focus()
      }
    }
  }

  private handleArrowNavigation(e: KeyboardEvent) {
    const target = e.target as HTMLElement
    
    // Handle custom components like tab lists, menus, etc.
    if (target.closest('[role="tablist"]')) {
      this.handleTabListNavigation(e, target)
    } else if (target.closest('[role="menu"]')) {
      this.handleMenuNavigation(e, target)
    } else if (target.closest('[role="listbox"]')) {
      this.handleListboxNavigation(e, target)
    }
  }

  private handleTabListNavigation(e: KeyboardEvent, target: HTMLElement) {
    const tablist = target.closest('[role="tablist"]')
    const tabs = Array.from(tablist?.querySelectorAll('[role="tab"]') || [])
    const currentIndex = tabs.indexOf(target)

    let nextIndex = currentIndex
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % tabs.length
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
    }

    if (nextIndex !== currentIndex) {
      e.preventDefault()
      ;(tabs[nextIndex] as HTMLElement).focus()
      ;(tabs[nextIndex] as HTMLElement).click()
    }
  }

  private handleMenuNavigation(e: KeyboardEvent, target: HTMLElement) {
    const menu = target.closest('[role="menu"]')
    const items = Array.from(menu?.querySelectorAll('[role="menuitem"]') || [])
    const currentIndex = items.indexOf(target)

    let nextIndex = currentIndex
    if (e.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % items.length
    } else if (e.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + items.length) % items.length
    }

    if (nextIndex !== currentIndex) {
      e.preventDefault()
      ;(items[nextIndex] as HTMLElement).focus()
    }
  }

  private handleListboxNavigation(e: KeyboardEvent, target: HTMLElement) {
    const listbox = target.closest('[role="listbox"]')
    const options = Array.from(listbox?.querySelectorAll('[role="option"]') || [])
    const currentIndex = options.indexOf(target)

    let nextIndex = currentIndex
    if (e.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % options.length
    } else if (e.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + options.length) % options.length
    }

    if (nextIndex !== currentIndex) {
      e.preventDefault()
      ;(options[nextIndex] as HTMLElement).focus()
      options[nextIndex].setAttribute('aria-selected', 'true')
      options.forEach((option, index) => {
        if (index !== nextIndex) {
          option.setAttribute('aria-selected', 'false')
        }
      })
    }
  }

  private enhanceFocusIndicator(element: HTMLElement) {
    element.classList.add('a11y-focused')
  }

  private removeFocusIndicator(element: HTMLElement) {
    element.classList.remove('a11y-focused')
  }

  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable]'
    ].join(', ')

    return Array.from(container.querySelectorAll(selector))
  }

  private setupFocusManagement() {
    // Track focus history for restoration
    document.addEventListener('focusin', (e) => {
      const target = e.target as HTMLElement
      if (target && target !== document.body) {
        this.focusHistory.push(target)
        // Keep only last 10 focused elements
        if (this.focusHistory.length > 10) {
          this.focusHistory.shift()
        }
      }
    })
  }

  private detectHighContrast() {
    if (window.matchMedia) {
      const highContrastQuery = window.matchMedia('(prefers-contrast: high)')
      const handleHighContrast = (e: MediaQueryListEvent | MediaQueryList) => {
        document.body.classList.toggle('high-contrast', e.matches)
        this.announce(`High contrast mode ${e.matches ? 'enabled' : 'disabled'}`, 'polite')
      }
      
      highContrastQuery.addListener(handleHighContrast)
      handleHighContrast(highContrastQuery)
    }
  }

  private detectReducedMotion() {
    if (window.matchMedia) {
      const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      const handleReducedMotion = (e: MediaQueryListEvent | MediaQueryList) => {
        document.body.classList.toggle('reduced-motion', e.matches)
        if (e.matches) {
          // Disable animations and transitions
          const style = document.createElement('style')
          style.textContent = `
            *, *::before, *::after {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
            }
          `
          document.head.appendChild(style)
        }
      }
      
      reducedMotionQuery.addListener(handleReducedMotion)
      handleReducedMotion(reducedMotionQuery)
    }
  }

  private detectScreenReader() {
    // Detect screen reader usage
    const isScreenReader = navigator.userAgent.includes('NVDA') || 
                          navigator.userAgent.includes('JAWS') || 
                          navigator.userAgent.includes('VoiceOver') ||
                          window.speechSynthesis

    if (isScreenReader) {
      document.body.classList.add('screen-reader-active')
    }
  }

  trapFocus(container: HTMLElement) {
    this.keyboardTrapStack.push(container)
    container.setAttribute('data-focus-trapped', 'true')
  }

  releaseFocus(container: HTMLElement) {
    const index = this.keyboardTrapStack.indexOf(container)
    if (index > -1) {
      this.keyboardTrapStack.splice(index, 1)
      container.removeAttribute('data-focus-trapped')
    }
  }

  // Accessibility violation checker
  checkViolations(): Array<{type: string, element: HTMLElement, message: string, severity: 'minor' | 'moderate' | 'serious' | 'critical'}> {
    const violations = []
    
    // Check for proper heading hierarchy
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
    let previousLevel = 0
    
    headings.forEach((heading) => {
      const level = parseInt(heading.tagName.charAt(1))
      
      if (level > previousLevel + 1) {
        violations.push({
          type: 'heading-hierarchy',
          element: heading as HTMLElement,
          message: `Heading level skipped: ${heading.tagName} after h${previousLevel}`,
          severity: 'moderate' as const
        })
      }
      
      previousLevel = level
    })

    // Check for alt text on images
    const images = document.querySelectorAll('img')
    images.forEach((img) => {
      if (!img.hasAttribute('alt')) {
        violations.push({
          type: 'missing-alt-text',
          element: img,
          message: 'Image missing alt attribute',
          severity: 'serious' as const
        })
      }
    })

    // Check for form labels
    const inputs = document.querySelectorAll('input, textarea, select')
    inputs.forEach((input) => {
      const hasLabel = input.hasAttribute('aria-label') || 
                      input.hasAttribute('aria-labelledby') ||
                      document.querySelector(`label[for="${input.id}"]`)
      
      if (!hasLabel) {
        violations.push({
          type: 'missing-label',
          element: input as HTMLElement,
          message: 'Form control missing accessible label',
          severity: 'serious' as const
        })
      }
    })

    // Check color contrast (simplified)
    const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6')
    textElements.forEach((element) => {
      const styles = window.getComputedStyle(element)
      const bgColor = styles.backgroundColor
      const textColor = styles.color
      
      // This is a simplified check - in production you'd use a proper contrast ratio calculation
      if (bgColor === textColor || (bgColor === 'rgba(0, 0, 0, 0)' && textColor === 'rgb(255, 255, 255)')) {
        violations.push({
          type: 'poor-contrast',
          element: element as HTMLElement,
          message: 'Potential color contrast issue',
          severity: 'moderate' as const
        })
      }
    })

    return violations
  }
}

export const a11y = new AccessibilityManager() 
export const a11y = new AccessibilityManager() 