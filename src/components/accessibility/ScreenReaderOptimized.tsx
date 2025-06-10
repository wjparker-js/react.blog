import React from 'react'
import styled from 'styled-components'

// Screen reader only content
const ScreenReaderOnly = styled.span`
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
`

// Enhanced table with proper ARIA labels
export const AccessibleTable: React.FC<{
  caption: string
  headers: string[]
  data: any[][]
  sortable?: boolean
  onSort?: (columnIndex: number) => void
}> = ({ caption, headers, data, sortable = false, onSort }) => {
  const [sortColumn, setSortColumn] = React.useState<number | null>(null)
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc')

  const handleSort = (columnIndex: number) => {
    if (!sortable || !onSort) return

    if (sortColumn === columnIndex) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(columnIndex)
      setSortDirection('asc')
    }
    onSort(columnIndex)
  }

  return (
    <table role="table" aria-label={caption}>
      <caption>
        {caption}
        {sortable && (
          <ScreenReaderOnly>
            , sortable table. Use Enter or Space to sort columns.
          </ScreenReaderOnly>
        )}
      </caption>
      
      <thead>
        <tr role="row">
          {headers.map((header, index) => (
            <th
              key={index}
              role="columnheader"
              scope="col"
              tabIndex={sortable ? 0 : undefined}
              aria-sort={
                sortColumn === index 
                  ? sortDirection === 'asc' ? 'ascending' : 'descending'
                  : sortable ? 'none' : undefined
              }
              onClick={() => handleSort(index)}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && sortable) {
                  e.preventDefault()
                  handleSort(index)
                }
              }}
              style={{
                cursor: sortable ? 'pointer' : 'default',
                userSelect: 'none'
              }}
            >
              {header}
              {sortable && (
                <ScreenReaderOnly>
                  {sortColumn === index 
                    ? `, sorted ${sortDirection === 'asc' ? 'ascending' : 'descending'}`
                    : ', not sorted'
                  }
                </ScreenReaderOnly>
              )}
            </th>
          ))}
        </tr>
      </thead>
      
      <tbody>
        {data.map((row, rowIndex) => (
          <tr key={rowIndex} role="row">
            {row.map((cell, cellIndex) => (
              <td
                key={cellIndex}
                role="cell"
                headers={`col-${cellIndex}`}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// Enhanced form with proper labeling and error handling
export const AccessibleForm: React.FC<{
  children: React.ReactNode
  onSubmit: (e: React.FormEvent) => void
  title: string
  description?: string
}> = ({ children, onSubmit, title, description }) => {
  return (
    <form onSubmit={onSubmit} role="form" aria-labelledby="form-title" aria-describedby={description ? "form-description" : undefined}>
      <h2 id="form-title">{title}</h2>
      {description && (
        <p id="form-description">{description}</p>
      )}
      {children}
    </form>
  )
}

// Enhanced input with proper error handling
export const AccessibleInput: React.FC<{
  label: string
  type?: string
  value: string
  onChange: (value: string) => void
  error?: string
  required?: boolean
  description?: string
  placeholder?: string
}> = ({ label, type = 'text', value, onChange, error, required, description, placeholder }) => {
  const inputId = React.useId()
  const errorId = React.useId()
  const descriptionId = React.useId()

  return (
    <div style={{ marginBottom: '16px' }}>
      <label htmlFor={inputId} style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>
        {label}
        {required && <span aria-label="required"> *</span>}
      </label>
      
      {description && (
        <p id={descriptionId} style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
          {description}
        </p>
      )}
      
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={`${description ? descriptionId : ''} ${error ? errorId : ''}`.trim() || undefined}
        aria-required={required}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '8px',
          border: `2px solid ${error ? '#CC0000' : '#DDDDDD'}`,
          borderRadius: '4px',
          fontSize: '16px'
        }}
      />
      
      {error && (
        <div
          id={errorId}
          role="alert"
          aria-live="polite"
          style={{ color: '#CC0000', fontSize: '14px', marginTop: '4px' }}
        >
          {error}
        </div>
      )}
    </div>
  )
}

// Enhanced pagination with proper ARIA labels
export const AccessiblePagination: React.FC<{
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}> = ({ currentPage, totalPages, onPageChange }) => {
  const getVisiblePages = () => {
    const delta = 2
    const range = []
    const rangeWithDots = []

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i)
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...')
    } else {
      rangeWithDots.push(1)
    }

    rangeWithDots.push(...range)

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages)
    } else {
      rangeWithDots.push(totalPages)
    }

    return rangeWithDots
  }

  return (
    <nav role="navigation" aria-label="Pagination">
      <ul style={{ display: 'flex', listStyle: 'none', padding: 0, gap: '4px' }}>
        <li>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Go to previous page"
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              background: currentPage === 1 ? '#f5f5f5' : 'white',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
            }}
          >
            Previous
          </button>
        </li>
        
        {getVisiblePages().map((page, index) => (
          <li key={index}>
            {page === '...' ? (
              <span style={{ padding: '8px 12px' }} aria-hidden="true">...</span>
            ) : (
              <button
                onClick={() => onPageChange(page as number)}
                aria-label={`Go to page ${page}`}
                aria-current={currentPage === page ? 'page' : undefined}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  background: currentPage === page ? '#0066CC' : 'white',
                  color: currentPage === page ? 'white' : 'black',
                  cursor: 'pointer'
                }}
              >
                {page}
              </button>
            )}
          </li>
        ))}
        
        <li>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Go to next page"
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              background: currentPage === totalPages ? '#f5f5f5' : 'white',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
            }}
          >
            Next
          </button>
        </li>
      </ul>
      
      <ScreenReaderOnly>
        Page {currentPage} of {totalPages}
      </ScreenReaderOnly>
    </nav>
  )
} 