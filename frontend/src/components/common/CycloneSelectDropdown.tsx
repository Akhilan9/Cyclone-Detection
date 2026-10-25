import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, Wind, Globe, Layers, X } from 'lucide-react';
import { Cyclone } from '../../types';

interface CycloneSelectDropdownProps {
  cyclones: Cyclone[];
  selectedCycloneId: string;
  onSelectCyclone: (cycloneId: string) => void;
  fullWidth?: boolean;
  accentColor?: string;
  placeholder?: string;
  idPrefix?: string;
}

const BASINS = [
  { id: 'ALL', label: 'All Basins' },
  { id: 'North Indian Ocean', label: 'North Indian' },
  { id: 'North Atlantic', label: 'Atlantic' },
  { id: 'Western Pacific', label: 'W. Pacific' },
  { id: 'Eastern Pacific', label: 'E. Pacific' },
  { id: 'Southern Hemisphere', label: 'S. Hemisphere' },
];

export const CycloneSelectDropdown: React.FC<CycloneSelectDropdownProps> = ({
  cyclones,
  selectedCycloneId,
  onSelectCyclone,
  fullWidth = false,
  accentColor = '#2563eb',
  placeholder = 'Select Cyclone',
  idPrefix = 'cyc',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBasin, setSelectedBasin] = useState('ALL');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const selectedCyclone = cyclones.find((c) => c.cyclone_id === selectedCycloneId) || cyclones[0];

  const filteredCyclones = cyclones.filter((c) => {
    const matchesBasin = selectedBasin === 'ALL' || c.basin === selectedBasin;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(term) ||
      c.highest_imd_stage?.toLowerCase().includes(term) ||
      c.season_year.toString().includes(term) ||
      c.basin.toLowerCase().includes(term) ||
      c.subbasin?.toLowerCase().includes(term);
    return matchesBasin && matchesSearch;
  });

  const getStageBadgeStyle = (stage?: string | null) => {
    if (!stage) return { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
    const s = stage.toLowerCase();
    if (s.includes('super') || s.includes('cat 5') || s.includes('category 5')) {
      return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
    }
    if (s.includes('extremely severe') || s.includes('cat 4') || s.includes('category 4')) {
      return { bg: '#faf5ff', color: '#9333ea', border: '#e9d5ff' };
    }
    if (s.includes('very severe') || s.includes('cat 3') || s.includes('category 3') || s.includes('major hurricane')) {
      return { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' };
    }
    if (s.includes('severe') || s.includes('cat 2') || s.includes('category 2') || s.includes('typhoon')) {
      return { bg: '#fefce8', color: '#ca8a04', border: '#fef08a' };
    }
    return { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
  };

  const getBasinColor = (basin: string) => {
    if (basin.includes('Atlantic')) return { bg: '#ecfeff', text: '#0891b2', border: '#a5f3fc' };
    if (basin.includes('Western Pacific')) return { bg: '#fdf4ff', text: '#c026d3', border: '#f5d0fe' };
    if (basin.includes('Eastern Pacific')) return { bg: '#fff1f2', text: '#e11d48', border: '#fecdd3' };
    if (basin.includes('Southern')) return { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' };
    return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' };
  };

  const activeBadge = getStageBadgeStyle(selectedCyclone?.highest_imd_stage);
  const activeBasinColor = getBasinColor(selectedCyclone?.basin || 'North Indian Ocean');

  return (
    <div
      ref={dropdownRef}
      style={{
        position: 'relative',
        display: fullWidth ? 'block' : 'inline-block',
        width: fullWidth ? '100%' : 'auto',
        zIndex: isOpen ? 9999 : 1,
      }}
    >
      {/* Trigger Button */}
      <button
        type="button"
        id={`${idPrefix}-dropdown-trigger`}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '9px 14px',
          backgroundColor: isOpen ? '#f8fafc' : '#ffffff',
          border: isOpen ? `2px solid ${accentColor}` : '1.5px solid #cbd5e1',
          borderRadius: '12px',
          cursor: 'pointer',
          boxShadow: isOpen ? `0 0 0 4px ${accentColor}20` : '0 1px 3px rgba(0,0,0,0.06)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          minWidth: fullWidth ? '100%' : '280px',
          width: fullWidth ? '100%' : 'auto',
          textAlign: 'left',
          boxSizing: 'border-box',
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.borderColor = accentColor;
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.08)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.borderColor = '#cbd5e1';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
          }
        }}
      >
        <div
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '9px',
            backgroundColor: activeBadge.bg,
            border: `1px solid ${activeBadge.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'transform 0.2s ease',
          }}
        >
          <Wind size={18} color={activeBadge.color} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
              {selectedCyclone?.name || placeholder}
            </span>
            {selectedCyclone && (
              <>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', backgroundColor: '#f1f5f9', padding: '1px 6px', borderRadius: '4px' }}>
                  {selectedCyclone.season_year}
                </span>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: activeBasinColor.text, backgroundColor: activeBasinColor.bg, border: `1px solid ${activeBasinColor.border}`, padding: '1px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                  {selectedCyclone.basin}
                </span>
              </>
            )}
          </div>
          <div style={{ fontSize: '0.72rem', color: activeBadge.color, fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', marginTop: '1px' }}>
            {selectedCyclone?.highest_imd_stage || 'Tropical Disturbance'} • {selectedCyclone?.max_wind_speed_kts || 45} kts
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            backgroundColor: isOpen ? `${accentColor}15` : 'transparent',
            flexShrink: 0,
            transition: 'all 0.2s ease',
          }}
        >
          <ChevronDown
            size={18}
            color={isOpen ? accentColor : '#64748b'}
            style={{
              transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </div>
      </button>

      {/* Animated Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            zIndex: 99999,
            width: fullWidth ? '100%' : '390px',
            minWidth: '320px',
            maxWidth: '100vw',
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 20px 48px rgba(15, 23, 42, 0.2), 0 6px 16px rgba(15, 23, 42, 0.1)',
            padding: '12px',
            animation: 'fadeInScale 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            overflow: 'hidden',
            boxSizing: 'border-box',
          }}
        >
          {/* Header info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Select Cyclone ({filteredCyclones.length} Available)
            </span>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
              ESC to close
            </span>
          </div>

          {/* Global Basin Filter Pills */}
          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
            {BASINS.map((b) => {
              const isActive = selectedBasin === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBasin(b.id)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    border: isActive ? `1.5px solid ${accentColor}` : '1px solid #e2e8f0',
                    backgroundColor: isActive ? `${accentColor}12` : '#ffffff',
                    color: isActive ? accentColor : '#64748b',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = '#ffffff';
                  }}
                >
                  {b.label}
                </button>
              );
            })}
          </div>

          {/* Search Input Filter */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 10px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1.5px solid #e2e8f0',
              marginBottom: '8px',
              transition: 'border-color 0.2s ease',
            }}
          >
            <Search size={14} color="#64748b" />
            <input
              type="text"
              placeholder="Search cyclone by name, year, basin, category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.8rem',
                color: '#0f172a',
                fontWeight: 600,
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  color: '#94a3b8',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Cyclones List */}
          <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {filteredCyclones.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.78rem', color: '#94a3b8' }}>
                No cyclones found matching filters
              </div>
            ) : (
              filteredCyclones.map((c) => {
                const isSelected = c.cyclone_id === selectedCycloneId;
                const badge = getStageBadgeStyle(c.highest_imd_stage);
                const bColor = getBasinColor(c.basin);

                return (
                  <div
                    key={c.cyclone_id}
                    onClick={() => {
                      onSelectCyclone(c.cyclone_id);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? `${accentColor}12` : 'transparent',
                      border: isSelected ? `1px solid ${accentColor}40` : '1px solid transparent',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                        e.currentTarget.style.transform = 'translateX(3px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          backgroundColor: badge.bg,
                          border: `1px solid ${badge.border}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Wind size={15} color={badge.color} />
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                            {c.name}
                          </span>
                          <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748b' }}>
                            ({c.season_year})
                          </span>
                          <span style={{ fontSize: '0.6rem', fontWeight: 800, color: bColor.text, backgroundColor: bColor.bg, border: `1px solid ${bColor.border}`, padding: '1px 5px', borderRadius: '3px' }}>
                            {c.basin.replace(' Ocean', '')}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b', display: 'flex', gap: '6px', marginTop: '1px' }}>
                          <span style={{ color: badge.color, fontWeight: 700 }}>
                            {c.highest_imd_stage || 'CS'}
                          </span>
                          <span>•</span>
                          <span>{c.max_wind_speed_kts} kts</span>
                          <span>•</span>
                          <span>{c.min_central_pressure_hpa} hPa</span>
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: accentColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Check size={13} color="#ffffff" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
