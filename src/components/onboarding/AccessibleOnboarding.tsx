import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { Modal } from '../accessibility/Modal'
import { a11y } from '../../utils/accessibility'

const OnboardingContent = styled.div`
  max-width: 600px;
  text-align: center;
`

const ProgressBar = styled.div<{ progress: number }>`
  width: 100%;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  margin: 20px 0;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: ${props => props.progress}%;
    background: var(--color-primary);
    border-radius: 4px;
    transition: width 0.3s ease;
  }
`

const StepIndicator = styled.div`
  display: flex;
  justify-content: center;
  margin: 20px 0;
  gap: 8px;
`

const Step = styled.div<{ active: boolean; completed: boolean }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => 
    props.completed ? 'var(--color-success)' :
    props.active ? 'var(--color-primary)' : '#e0e0e0'
  };
  border: 2px solid ${props => props.active ? 'var(--color-primary)' : 'transparent'};
`

const NavigationButtons = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 32px;
  gap: 16px;
`

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 12px 24px;
  border: 2px solid var(--color-primary);
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  ${props => props.variant === 'primary' ? `
    background: var(--color-primary);
    color: white;
    
    &:hover:not(:disabled) {
      background: var(--color-primary-dark);
    }
  ` : `
    background: transparent;
    color: var(--color-primary);
    
    &:hover:not(:disabled) {
      background: var(--color-primary);
      color: white;
    }
  `}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  &:focus {
    outline: 3px solid var(--color-focus);
    outline-offset: 2px;
  }
`

interface OnboardingStep {
  id: string
  title: string
  content: React.ReactNode
  optional?: boolean
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to the CMS',
    content: (
      <div>
        <h3>Welcome to your new Content Management System!</h3>
        <p>This quick tour will help you get started with managing your content effectively.</p>
        <p>You can skip this tour at any time or return to it later from the help menu.</p>
      </div>
    )
  },
  {
    id: 'accessibility',
    title: 'Accessibility Features',
    content: (
      <div>
        <h3>Accessibility & Customization</h3>
        <p>This CMS is built with accessibility in mind. Here are some features:</p>
        <ul style={{ textAlign: 'left', margin: '16px 0' }}>
          <li>Full keyboard navigation support</li>
          <li>Screen reader compatibility</li>
          <li>Color-blind friendly themes</li>
          <li>High contrast mode</li>
          <li>Customizable text size</li>
        </ul>
        <p>Access these settings from the user menu in the top-right corner.</p>
      </div>
    )
  },
  {
    id: 'navigation',
    title: 'Navigation',
    content: (
      <div>
        <h3>Getting Around</h3>
        <p>Use the sidebar menu to navigate between different sections:</p>
        <ul style={{ textAlign: 'left', margin: '16px 0' }}>
          <li><strong>Dashboard:</strong> Overview and quick actions</li>
          <li><strong>Posts:</strong> Create and manage your content</li>
          <li><strong>Media:</strong> Upload and organize files</li>
          <li><strong>Categories:</strong> Organize your content</li>
          <li><strong>Analytics:</strong> Track your content performance</li>
        </ul>
      </div>
    )
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts',
    content: (
      <div>
        <h3>Productivity Shortcuts</h3>
        <p>Speed up your workflow with these keyboard shortcuts:</p>
        <ul style={{ textAlign: 'left', margin: '16px 0' }}>
          <li><kbd>Ctrl/Cmd + N</kbd> - Create new post</li>
          <li><kbd>Ctrl/Cmd + S</kbd> - Save current work</li>
          <li><kbd>Ctrl/Cmd + /</kbd> - Toggle help</li>
          <li><kbd>Escape</kbd> - Close modals/dropdowns</li>
          <li><kbd>Tab</kbd> - Navigate through elements</li>
        </ul>
        <p>You can view all shortcuts by pressing <kbd>?</kbd> on any page.</p>
      </div>
    )
  },
  {
    id: 'complete',
    title: 'Ready to Go!',
    content: (
      <div>
        <h3>You're All Set!</h3>
        <p>You now have everything you need to start creating amazing content.</p>
        <p>Remember:</p>
        <ul style={{ textAlign: 'left', margin: '16px 0' }}>
          <li>Start with the Dashboard for an overview</li>
          <li>Use the Posts section to create content</li>
          <li>Access help anytime from the user menu</li>
          <li>Customize accessibility settings as needed</li>
        </ul>
        <p>Happy content creating!</p>
      </div>
    )
  }
]

export const AccessibleOnboarding: React.FC<{
  isOpen: boolean
  onComplete: () => void
  onSkip: () => void
}> = ({ isOpen, onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())

  const progress = ((currentStep + 1) / onboardingSteps.length) * 100
  const isLastStep = currentStep === onboardingSteps.length - 1
  const isFirstStep = currentStep === 0

  useEffect(() => {
    if (isOpen) {
      a11y.announce(`Onboarding step ${currentStep + 1} of ${onboardingSteps.length}: ${onboardingSteps[currentStep].title}`)
    }
  }, [currentStep, isOpen])

  const handleNext = () => {
    setCompletedSteps(prev => new Set([...prev, currentStep]))
    
    if (isLastStep) {
      onComplete()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleStepClick = (stepIndex: number) => {
    setCurrentStep(stepIndex)
    a11y.announce(`Navigated to step ${stepIndex + 1}: ${onboardingSteps[stepIndex].title}`)
  }

  const currentStepData = onboardingSteps[currentStep]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onSkip}
      title="Getting Started Tour"
      closeOnOverlayClick={false}
    >
      <OnboardingContent>
        {/* Progress indicators */}
        <div role="progressbar" aria-valuenow={currentStep + 1} aria-valuemin={1} aria-valuemax={onboardingSteps.length}>
          <ProgressBar progress={progress} />
          <div aria-live="polite" style={{ fontSize: '14px', color: '#666' }}>
            Step {currentStep + 1} of {onboardingSteps.length}
          </div>
        </div>

        <StepIndicator role="tablist" aria-label="Onboarding steps">
          {onboardingSteps.map((step, index) => (
            <Step
              key={step.id}
              active={index === currentStep}
              completed={completedSteps.has(index)}
              role="tab"
              aria-selected={index === currentStep}
              aria-label={`Step ${index + 1}: ${step.title}`}
              tabIndex={0}
              onClick={() => handleStepClick(index)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleStepClick(index)
                }
              }}
              style={{ cursor: 'pointer' }}
            />
          ))}
        </StepIndicator>

        {/* Step content */}
        <div role="tabpanel" aria-labelledby={`step-${currentStep}`}>
          <h2 id={`step-${currentStep}`}>{currentStepData.title}</h2>
          {currentStepData.content}
        </div>

        {/* Navigation */}
        <NavigationButtons>
          <Button
            onClick={handlePrevious}
            disabled={isFirstStep}
            aria-label="Go to previous step"
          >
            Previous
          </Button>

          <Button
            onClick={onSkip}
            aria-label="Skip onboarding tour"
          >
            Skip Tour
          </Button>

          <Button
            variant="primary"
            onClick={handleNext}
            aria-label={isLastStep ? 'Complete onboarding' : 'Go to next step'}
          >
            {isLastStep ? 'Get Started' : 'Next'}
          </Button>
        </NavigationButtons>

        {/* Keyboard shortcuts help */}
        <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
          <p>Keyboard navigation: Use Tab to move between buttons, Enter to activate.</p>
          <p>Press Escape to skip the tour.</p>
        </div>
      </OnboardingContent>
    </Modal>
  )
} 