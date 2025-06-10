import React from 'react'
import styled from 'styled-components'

const SkipLinksContainer = styled.div`
  position: fixed;
  top: -100px;
  left: 0;
  z-index: 10000;
  transition: transform 0.2s ease-in-out;
  
  &:focus-within {
    transform: translateY(100px);
  }
  
  .keyboard-navigation &:focus-within {
    transform: translateY(100px);
  }
`

const SkipLink = styled.a`
  display: inline-block;
  padding: 12px 16px;
  background: var(--color-primary);
  color: white;
  text-decoration: none;
  font-weight: 600;
  border-radius: 0 0 4px 0;
  margin-right: 1px;
  
  &:focus {
    outline: 3px solid var(--color-focus);
    outline-offset: 2px;
  }
  
  &:hover {
    background: var(--color-primary-dark);
  }
`

interface SkipLinksProps {
  links?: Array<{ href: string; label: string }>
}

export const SkipLinks: React.FC<SkipLinksProps> = ({ 
  links = [
    { href: '#main-content', label: 'Skip to main content' },
    { href: '#navigation', label: 'Skip to navigation' },
    { href: '#search', label: 'Skip to search' },
    { href: '#footer', label: 'Skip to footer' }
  ]
}) => {
  return (
    <SkipLinksContainer className="skip-links" role="navigation" aria-label="Skip links">
      {links.map(({ href, label }) => (
        <SkipLink
          key={href}
          href={href}
          onClick={(e) => {
            e.preventDefault()
            const target = document.querySelector(href)
            if (target) {
              (target as HTMLElement).focus()
              target.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
          }}
        >
          {label}
        </SkipLink>
      ))}
    </SkipLinksContainer>
  )
} 