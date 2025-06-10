import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { useAccessibility } from '../../utils/accessibility'

const TourOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
`

const TourStep = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 500px;
  margin: 1rem;
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
  
  h2 {
    margin: 0 0 1rem 0;
    color: #111827;
  }
  
  p {
    color: #6B7280;
    line-height: 1.6;
    margin-bottom: 1.5rem;
  }
  
  .tour-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }
  
  button {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:focus {
      outline: 3px solid #4285f4;
      outline-offset: 2px;
    }
    
    &.primary {
      background: #3B82F6;
      color: white;
      
      &:hover {
        background: #2563EB;
      }
    }
    
    &.secondary {
      background: #F3F4F6;
      color: #374151;
      
      &:hover {
        background: #E5E7EB;
      }
    }
  }
  
  .progress {
    font-size: 0.875rem;
    color: #6B7280;
  }
`

const Spotlight = styled.div<{ target: string }>`
  position: fixed;
  z-index: 9999;
  pointer-events: none;
  border: 3px solid #3B82F6;
  border-radius: 8px;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);
  transition: all 0.3s ease;
`

interface TourStep {
  id: string
  title: string
  content: string
  target?: string
  action?: () => void
  skipable?: boolean
}

const accessibilityTourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: '♿ Welcome to Accessible CMS',
    content: 'This CMS is designed to be fully accessible. Let us show you the accessibility features available to enhance your experience.'
  },
  {
    id: 'skip-links',
    title: '🔗 Skip Navigation Links',
    content: 'Press Tab or Alt+S to see skip links that let you jump to different sections quickly. This is especially helpful for keyboard and screen reader users.',
    target: 'body',
    action: () => {
      // Simulate showing skip links
      document.querySelectorAll('.skip-link').forEach(link => {
        (link as HTMLElement).classList.add('visible')
      })
      setTimeout(() => {
        document.querySelectorAll('.skip-link').forEach(link => {
          (link as HTMLElement).classList.remove('visible')
        })
      }, 3000)
    }
  },
  {
    id: 'keyboard-navigation',
    title: '⌨️ Keyboard Navigation',
    content: 'You can navigate the entire interface using only your keyboard. Use Tab to move forward, Shift+Tab to move backward, Enter to activate, and Escape to close dialogs.',
    target: '#main-navigation'
  },
  {
    id: 'color-themes',
    title: '🎨 Color-Blind Friendly Themes',
    content: 'Press Alt+Shift+A to access color-blind friendly themes and high contrast mode. We support different types of color vision deficiencies.',
    action: () => {
      // Show color theme panel briefly
      const event = new KeyboardEvent('keydown', {
        key: 'A',
        altKey: true,
        shiftKey: true
      })
      document.dispatchEvent(event)
    }
  },
  {
    id: 'screen-reader',
    title: '📢 Screen Reader Support',
    content: 'All content is properly labeled for screen readers. Dynamic updates are announced, and complex interactions have detailed instructions.',
    target: '#main-content'
  },
  {
    id: 'reduced-motion',
    title: '🎬 Motion Preferences',
    content: 'If you prefer reduced motion, the interface automatically detects this and minimizes animations. All essential information is available without motion.',
    skipable: true
  },
  {
    id: 'help-support',
    title: '❓ Accessibility Help',
    content: 'If you need accessibility assistance, press F1 for help or contact our support team. We\'re committed to making this CMS work for everyone.',
    target: '#accessibility-help'
  }
]

export const AccessibilityTour: React.FC = () => {
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [hasSeenTour, setHasSeenTour] = useState(false)
  const { announce, trapFocus, releaseFocus } = useAccessibility()

  useEffect(() => {
    // Check if user has seen the tour
    const seen = localStorage.getItem('accessibility-tour-seen')
    setHasSeenTour(!!seen)

    // Auto-start tour for new users
    if (!seen) {
      setTimeout(() => setIsActive(true), 1000)
    }

    // Keyboard shortcut to start tour
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault()
        setIsActive(true)
        setCurrentStep(0)
      }
    }

    document.addEventListener('keydown', handleKeyboard)
    return () => document.removeEventListener('keydown', handleKeyboard)
  }, [])

  useEffect(() => {
    if (isActive) {
      const tourElement = document.querySelector('[role="dialog"]')
      if (tourElement) {
        trapFocus(tourElement as HTMLElement)
        announce('Accessibility tour started', 'assertive')
      }
    } else {
      const tourElement = document.querySelector('[role="dialog"]')
      if (tourElement) {
        releaseFocus(tourElement as HTMLElement)
      }
    }
  }, [isActive, trapFocus, releaseFocus, announce])

  const nextStep = () => {
    if (currentStep < accessibilityTourSteps.length - 1) {
      setCurrentStep(currentStep + 1)
      announce(`Step ${currentStep + 1} completed`, 'polite')
    }
  }

  return (
    <TourOverlay>
      {/* Tour content */}
    </TourOverlay>
  )
} 