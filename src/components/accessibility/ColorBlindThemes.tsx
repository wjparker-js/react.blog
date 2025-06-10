import React, { useState, useEffect, createContext, useContext } from 'react'
import styled from 'styled-components'

// Color-blind friendly palettes
const colorBlindPalettes = {
  normal: {
    primary: '#3B82F6',
    secondary: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
    info: '#06B6D4',
    success: '#10B981',
    background: '#FFFFFF',
    surface: '#F9FAFB',
    text: '#111827',
    textMuted: '#6B7280'
  },
  deuteranopia: { // Red-green colorblind (most common)
    primary: '#2563EB', // Blue
    secondary: '#7C3AED', // Purple
    danger: '#DC2626', // Strong red
    warning: '#D97706', // Orange
    info: '#0891B2', // Cyan
    success: '#059669', // Darker green
    background: '#FFFFFF',
    surface: '#F9FAFB',
    text: '#111827',
    textMuted: '#4B5563'
  },
  protanopia: { // Red-green colorblind (another type)
    primary: '#1D4ED8', // Blue
    secondary: '#7C2D12', // Brown
    danger: '#991B1B', // Dark red
    warning: '#EA580C', // Orange
    info: '#0369A1', // Blue
    success: '#166534', // Dark green
    background: '#FFFFFF',
    surface: '#F9FAFB',
    text: '#111827',
    textMuted: '#4B5563'
  },
  tritanopia: { // Blue-yellow colorblind (rare)
    primary: '#DC2626', // Red
    secondary: '#059669', // Green
    danger: '#7F1D1D', // Dark red
    warning: '#92400E', // Dark orange
    info: '#374151', // Gray
    success: '#064E3B', // Dark green
    background: '#FFFFFF',
    surface: '#F9FAFB',
    text: '#111827',
    textMuted: '#4B5563'
  },
  monochrome: { // Complete color blindness (very rare)
    primary: '#374151',
    secondary: '#6B7280',
    danger: '#111827',
    warning: '#4B5563',
    info: '#9CA3AF',
    success: '#D1D5DB',
    background: '#FFFFFF',
    surface: '#F9FAFB',
    text: '#111827',
    textMuted: '#6B7280'
  }
}

type ColorBlindType = keyof typeof colorBlindPalettes

interface ColorBlindContextType {
  colorBlindType: ColorBlindType
  setColorBlindType: (type: ColorBlindType) => void
  palette: typeof colorBlindPalettes.normal
  isHighContrast: boolean
  setHighContrast: (enabled: boolean) => void
}

const ColorBlindContext = createContext<ColorBlindContextType | undefined>(undefined)

const ThemeContainer = styled.div<{ palette: any, highContrast: boolean }>`
  --color-primary: ${props => props.palette.primary};
  --color-secondary: ${props => props.palette.secondary};
  --color-danger: ${props => props.palette.danger};
  --color-warning: ${props => props.palette.warning};
  --color-info: ${props => props.palette.info};
  --color-success: ${props => props.palette.success};
  --color-background: ${props => props.palette.background};
  --color-surface: ${props => props.palette.surface};
  --color-text: ${props => props.palette.text};
  --color-text-muted: ${props => props.palette.textMuted};
  
  ${props => props.highContrast && `
    --color-background: #000000;
    --color-surface: #1a1a1a;
    --color-text: #ffffff;
    --color-text-muted: #cccccc;
    
    filter: contrast(150%);
    
    * {
      border-color: #ffffff !important;
    }
    
    button, input, select, textarea {
      border: 2px solid #ffffff !important;
    }
  `}
  
  /* Pattern overlays for additional distinction */
  .status-danger::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: repeating-linear-gradient(
      45deg,
      transparent,
      transparent 2px,
      rgba(255,255,255,0.1) 2px,
      rgba(255,255,255,0.1) 4px
    );
    pointer-events: none;
  }
  
  .status-warning::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: repeating-linear-gradient(
      90deg,
      transparent,
      transparent 3px,
      rgba(255,255,255,0.1) 3px,
      rgba(255,255,255,0.1) 6px
    );
    pointer-events: none;
  }
  
  .status-success::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: radial-gradient(
      circle,
      rgba(255,255,255,0.1) 1px,
      transparent 1px
    );
    background-size: 8px 8px;
    pointer-events: none;
  }
`

const ColorBlindControls = styled.div`
  position: fixed;
  top: 80px;
  right: 16px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
  z-index: 1000;
  max-width: 280px;
  
  h3 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
  }
  
  label {
    display: block;
    margin-bottom: 8px;
    font-size: 13px;
    cursor: pointer;
    
    input {
      margin-right: 8px;
    }
  }
  
  .toggle-group {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #e5e7eb;
  }
`

export const ColorBlindProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [colorBlindType, setColorBlindType] = useState<ColorBlindType>('normal')
  const [isHighContrast, setHighContrast] = useState(false)
  const [showControls, setShowControls] = useState(false)

  // Detect user preferences
  useEffect(() => {
    // Check for saved preferences
    const saved = localStorage.getItem('colorBlindPreferences')
    if (saved) {
      const prefs = JSON.parse(saved)
      setColorBlindType(prefs.type)
      setHighContrast(prefs.highContrast)
    }

    // Listen for high contrast preference
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)')
    if (highContrastQuery.matches) {
      setHighContrast(true)
    }

    // Keyboard shortcut to toggle controls
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && e.key === 'A') {
        setShowControls(prev => !prev)
      }
    }

    document.addEventListener('keydown', handleKeyboard)
    return () => document.removeEventListener('keydown', handleKeyboard)
  }, [])

  // Save preferences
  useEffect(() => {
    localStorage.setItem('colorBlindPreferences', JSON.stringify({
      type: colorBlindType,
      highContrast: isHighContrast
    }))
  }, [colorBlindType, isHighContrast])

  const palette = colorBlindPalettes[colorBlindType]

  return (
    <ColorBlindContext.Provider value={{
      colorBlindType,
      setColorBlindType,
      palette,
      isHighContrast,
      setHighContrast
    }}>
      <ThemeContainer palette={palette} highContrast={isHighContrast}>
        {children}
        
        {showControls && (
          <ColorBlindControls>
            <h3>🎨 Accessibility Options</h3>
            <div>
              <label>
                <input
                  type="radio"
                  name="colorBlind"
                  checked={colorBlindType === 'normal'}
                  onChange={() => setColorBlindType('normal')}
                />
                Normal Vision
              </label>
              <label>
                <input
                  type="radio"
                  name="colorBlind"
                  checked={colorBlindType === 'deuteranopia'}
                  onChange={() => setColorBlindType('deuteranopia')}
                />
                Deuteranopia (Red-Green)
              </label>
              <label>
                <input
                  type="radio"
                  name="colorBlind"
                  checked={colorBlindType === 'protanopia'}
                  onChange={() => setColorBlindType('protanopia')}
                />
                Protanopia (Red-Green)
              </label>
              <label>
                <input
                  type="radio"
                  name="colorBlind"
                  checked={colorBlindType === 'tritanopia'}
                  onChange={() => setColorBlindType('tritanopia')}
                />
                Tritanopia (Blue-Yellow)
              </label>
              <label>
                <input
                  type="radio"
                  name="colorBlind"
                  checked={colorBlindType === 'monochrome'}
                  onChange={() => setColorBlindType('monochrome')}
                />
                Monochrome
              </label>
            </div>
            
            <div className="toggle-group">
              <label>
                <input
                  type="checkbox"
                  checked={isHighContrast}
                  onChange={(e) => setHighContrast(e.target.checked)}
                />
                High Contrast Mode
              </label>
            </div>
            
            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '12px' }}>
              Press Alt+Shift+A to toggle this panel
            </div>
          </ColorBlindControls>
        )}
      </ThemeContainer>
    </ColorBlindContext.Provider>
  )
}

export const useColorBlind = () => {
  const context = useContext(ColorBlindContext)
  if (!context) {
    throw new Error('useColorBlind must be used within ColorBlindProvider')
  }
  return context
}

// Accessible status indicators with patterns
export const StatusIndicator: React.FC<{
  status: 'success' | 'warning' | 'danger' | 'info'
  children: React.ReactNode
  showPattern?: boolean
}> = ({ status, children, showPattern = true }) => {
  const { palette } = useColorBlind()
  
  return (
    <div
      style={{
        position: 'relative',
        backgroundColor: palette[status],
        color: palette.background,
        padding: '8px 12px',
        borderRadius: '4px',
        display: 'inline-block'
      }}
      className={showPattern ? `status-${status}` : ''}
      role="status"
      aria-live="polite"
    >
      {children}
    </div>
  )
} 