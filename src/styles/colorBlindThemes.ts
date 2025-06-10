// Color-blind friendly color palettes
export const colorBlindPalettes = {
  // Deuteranopia (green-blind) friendly
  deuteranopia: {
    primary: '#0066CC',      // Blue
    secondary: '#FF6600',    // Orange
    success: '#0099CC',      // Light blue
    warning: '#FF9900',      // Amber
    error: '#CC0000',        // Red
    info: '#6600CC',         // Purple
    background: '#FFFFFF',
    surface: '#F5F5F5',
    text: '#333333',
    textSecondary: '#666666',
    border: '#DDDDDD'
  },
  
  // Protanopia (red-blind) friendly
  protanopia: {
    primary: '#0066CC',      // Blue
    secondary: '#009966',    // Teal
    success: '#0099CC',      // Light blue
    warning: '#FFCC00',      // Yellow
    error: '#FF6600',        // Orange
    info: '#6600CC',         // Purple
    background: '#FFFFFF',
    surface: '#F5F5F5',
    text: '#333333',
    textSecondary: '#666666',
    border: '#DDDDDD'
  },
  
  // Tritanopia (blue-blind) friendly
  tritanopia: {
    primary: '#CC0066',      // Magenta
    secondary: '#009900',    // Green
    success: '#66CC00',      // Lime
    warning: '#FF9900',      // Orange
    error: '#CC0000',        // Red
    info: '#996600',         // Brown
    background: '#FFFFFF',
    surface: '#F5F5F5',
    text: '#333333',
    textSecondary: '#666666',
    border: '#DDDDDD'
  },
  
  // High contrast theme
  highContrast: {
    primary: '#000000',
    secondary: '#FFFFFF',
    success: '#00AA00',
    warning: '#FFAA00',
    error: '#AA0000',
    info: '#0000AA',
    background: '#FFFFFF',
    surface: '#F0F0F0',
    text: '#000000',
    textSecondary: '#444444',
    border: '#000000'
  }
}

// Theme context for color-blind users
import React, { createContext, useContext, useEffect, useState } from 'react'

type ColorBlindType = 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia' | 'highContrast'

interface ColorBlindContextType {
  colorBlindType: ColorBlindType
  setColorBlindType: (type: ColorBlindType) => void
  currentPalette: typeof colorBlindPalettes.deuteranopia
}

const ColorBlindContext = createContext<ColorBlindContextType | undefined>(undefined)

export const ColorBlindProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [colorBlindType, setColorBlindType] = useState<ColorBlindType>(() => {
    return (localStorage.getItem('colorBlindType') as ColorBlindType) || 'none'
  })

  const currentPalette = colorBlindType === 'none' 
    ? colorBlindPalettes.deuteranopia // Default
    : colorBlindPalettes[colorBlindType]

  useEffect(() => {
    localStorage.setItem('colorBlindType', colorBlindType)
    
    // Apply CSS custom properties
    const root = document.documentElement
    Object.entries(currentPalette).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value)
    })
    
    // Add body class for specific styling
    document.body.className = document.body.className.replace(/color-blind-\w+/g, '')
    if (colorBlindType !== 'none') {
      document.body.classList.add(`color-blind-${colorBlindType}`)
    }
  }, [colorBlindType, currentPalette])

  return (
    <ColorBlindContext.Provider value={{ colorBlindType, setColorBlindType, currentPalette }}>
      {children}
    </ColorBlindContext.Provider>
  )
}

export const useColorBlindTheme = () => {
  const context = useContext(ColorBlindContext)
  if (!context) {
    throw new Error('useColorBlindTheme must be used within ColorBlindProvider')
  }
  return context
} 