import React, { useEffect, useState } from 'react'
import styled from 'styled-components'

const SkipLinksContainer = styled.div`
  position: fixed;
  top: -100px;
  left: 8px;
  z-index: 10000;
  
  &:focus-within {
    top: 8px;
  }
`

const SkipLink = styled.a`
  display: block;
  padding: 12px 16px;
  background: #000;
  color: #fff;
  text-decoration: none;
  border-radius: 4px;
  margin-bottom: 4px;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s ease;
  
  &:focus {
    outline: 3px solid #4285f4;
    outline-offset: 2px;
    top: 8px;
  }
  
  &:hover {
    background: #333;
  }
  
  &.visible {
    top: 8px;
  }
`

const Landmark = styled.div<{ role?: string }>`
  scroll-margin-top: 2rem;
  
  &:focus {
    outline: none;
  }
  
  &:focus-visible {
    outline: 2px solid #4285f4;
    outline-offset: 2px;
  }
`

interface SkipNavigationProps {
  landmarks?: Array<{
    id: string
    label: string
    href: string
  }>
}

export const SkipNavigation: React.FC<SkipNavigationProps> = ({ 
  landmarks = [
    { id: 'main-content', label: 'Skip to main content', href: '#main-content' },
    { id: 'main-navigation', label: 'Skip to navigation', href: '#main-navigation' },
    { id: 'search', label: 'Skip to search', href: '#search' },
    { id: 'footer', label: 'Skip to footer', href: '#footer' }
  ]
}) => {
  const [currentLandmark, setCurrentLandmark] = useState<string>('')

  useEffect(() => {
    // Ensure all landmark targets exist
    landmarks.forEach(landmark => {
      const target = document.querySelector(landmark.href)
      if (!target) {
        console.warn(`Skip navigation target not found: ${landmark.href}`)
      } else {
        // Make landmarks focusable
        target.setAttribute('tabindex', '-1')
        target.setAttribute('role', target.getAttribute('role') || 'region')
        target.setAttribute('aria-label', landmark.label.replace('Skip to ', ''))
      }
    })

    // Track current section for screen readers
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.target.id) {
            setCurrentLandmark(entry.target.id)
          }
        })
      },
      { rootMargin: '-20% 0px -80% 0px' }
    )

    landmarks.forEach(landmark => {
      const element = document.querySelector(landmark.href)
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [landmarks])

  const handleSkipClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    const target = document.querySelector(href)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      ;(target as HTMLElement).focus()
    }
  }

  return (
    <>
      <SkipLinksContainer>
        {landmarks.map(landmark => (
          <SkipLink
            key={landmark.id}
            href={landmark.href}
            onClick={(e) => handleSkipClick(e, landmark.href)}
            className="skip-link"
          >
            {landmark.label}
          </SkipLink>
        ))}
      </SkipLinksContainer>
      
      {/* Hidden current section announcement for screen readers */}
      <div 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
        aria-label={`Current section: ${currentLandmark.replace('-', ' ')}`}
      />
    </>
  )
}

// Enhanced main content wrapper
export const MainContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Landmark 
    id="main-content" 
    role="main" 
    aria-label="Main content"
    as="main"
  >
    {children}
  </Landmark>
)

// Enhanced navigation wrapper
export const Navigation: React.FC<{ children: React.ReactNode, label?: string }> = ({ 
  children, 
  label = "Main navigation" 
}) => (
  <Landmark 
    id="main-navigation" 
    role="navigation" 
    aria-label={label}
    as="nav"
  >
    {children}
  </Landmark>
) 