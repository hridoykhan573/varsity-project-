import React, { useState } from 'react'
import { ChevronDown, ArrowDownAz, Clock, ArrowDownWideNarrow, ArrowUpWideNarrow } from 'lucide-react'

const SORT_OPTIONS = [
  { key: 'time', label: 'Latest First', icon: <Clock size={14} /> },
  { key: 'name', label: 'Name (A-Z)', icon: <ArrowDownAz size={14} /> },
  { key: 'max_money', label: 'Highest Price', icon: <ArrowDownWideNarrow size={14} /> },
  { key: 'min_money', label: 'Lowest Price', icon: <ArrowUpWideNarrow size={14} /> },
]

export default function SortDropdown({ currentSort, onSort, options = ['time', 'name', 'max_money', 'min_money'] }) {
  const [isOpen, setIsOpen] = useState(false)

  const activeOptions = SORT_OPTIONS.filter(opt => options.includes(opt.key))
  const currentLabel = activeOptions.find(opt => opt.key === currentSort)?.label || 'Sort'

  return (
    <div style={{ position: 'relative' }}>
      <button 
        className="btn btn-ghost btn-sm" 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 8, 
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '6px 12px',
          fontSize: '0.8rem',
          fontWeight: 600
        }}
      >
        <span style={{ color: 'var(--gray-500)', fontWeight: 400 }}>Sort:</span>
        {currentLabel}
        <ChevronDown size={14} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
      </button>

      {isOpen && (
        <>
          <div 
            style={{ position: 'fixed', inset: 0, zIndex: 100 }} 
            onClick={() => setIsOpen(false)} 
          />
          <div 
            style={{ 
              position: 'absolute', 
              top: '100%', 
              right: 0, 
              marginTop: 4, 
              background: 'var(--gray-800)', 
              border: '1px solid rgba(255,255,255,0.1)', 
              borderRadius: 8, 
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              zIndex: 101,
              width: 160,
              overflow: 'hidden'
            }}
          >
            {activeOptions.map(opt => (
              <button
                key={opt.key}
                onClick={() => { onSort(opt.key); setIsOpen(false); }}
                style={{ 
                  width: '100%', 
                  padding: '10px 14px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 10, 
                  background: currentSort === opt.key ? 'rgba(249,115,22,0.1)' : 'transparent',
                  color: currentSort === opt.key ? 'var(--orange-400)' : 'var(--gray-200)',
                  border: 'none',
                  fontSize: '0.85rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: '0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseOut={e => e.currentTarget.style.background = currentSort === opt.key ? 'rgba(249,115,22,0.1)' : 'transparent'}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
