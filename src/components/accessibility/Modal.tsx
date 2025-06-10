import React, { useEffect, useRef, useCallback } from 'react'
import styled from 'styled-components'
import { a11y } from '../../utils/accessibility'

const ModalOverlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  opacity: ${props => props.isOpen ? 1 : 0};
  visibility: ${props => props.isOpen ? 'visible' : 'hidden'};
  transition: opacity 0.2s ease-in-out, visibility 0.2s ease-in-out;
  
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const ModalContent = styled.div<{ isOpen: boolean }>`
  background: white;
  border-radius: 8px;
  padding: 24px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  transform: ${props => props.isOpen ? 'scale(1)' : 'scale(0.95)'};
  transition: transform 0.2s ease-in-out;
  
  &:focus {
    outline: 3px solid var(--color-focus);
    outline-offset: 2px;
  }
  
  @media (prefers-reduced-motion: reduce) {
    transform: none;
    transition: none;
  }
`

const CloseButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  
  &:focus {
    outline: 3px solid var(--color-focus);
    outline-offset: 2px;
  }
  
  &:hover {
    background: var(--color-gray-100);
  }
`

const ModalTitle = styled.h2`
  margin: 0 0 16px 0;
  font-size: 1.5rem;
  color: var(--color-text-primary);
`

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
  closeOnOverlayClick = true,
  closeOnEscape = true
}) => {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousFocusRef.current = document.activeElement as HTMLElement
      
      // Focus the modal
      setTimeout(() => {
        modalRef.current?.focus()
      }, 100)
      
      // Trap focus within modal
      trapFocus()
      
      // Announce modal opening
      a11y.announce(`${title} dialog opened`)
    } else {
      // Restore focus when modal closes
      if (previousFocusRef.current) {
        previousFocusRef.current.focus()
      }
      
      a11y.announce('Dialog closed')
    }

    return () => {
      // Cleanup focus trap
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, title])

  const trapFocus = useCallback(() => {
    const modal = modalRef.current
    if (!modal) return

    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement.focus()
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement.focus()
          }
        }
      }
      
      if (e.key === 'Escape' && closeOnEscape) {
        e.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
  }, [onClose, closeOnEscape])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <ModalOverlay
      isOpen={isOpen}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-hidden={!isOpen}
    >
      <ModalContent
        ref={modalRef}
        isOpen={isOpen}
        className={className}
        tabIndex={-1}
      >
        <CloseButton
          onClick={onClose}
          aria-label={`Close ${title} dialog`}
          type="button"
        >
          ×
        </CloseButton>
        
        <ModalTitle id="modal-title">{title}</ModalTitle>
        
        <div role="document">
          {children}
        </div>
      </ModalContent>
    </ModalOverlay>
  )
} 