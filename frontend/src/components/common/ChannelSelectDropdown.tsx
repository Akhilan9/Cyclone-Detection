import React, { useState, useRef, useEffect } from 'react';
import { Layers, ChevronDown, Check, Eye, Flame, Combine } from 'lucide-react';

export type ChannelType = 'IRWIN' | 'VIS/WV' | 'Fused View';

interface ChannelSelectDropdownProps {
  selectedChannel: ChannelType;
  onSelectChannel: (channel: ChannelType) => void;
}

interface ChannelOption {
  id: ChannelType;
  title: string;
  badge: string;
  description: string;
  wavelength: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  bg: string;
  border: string;
}

const CHANNELS: ChannelOption[] = [
  {
    id: 'IRWIN',
    title: 'Thermal IR (IRWIN)',
    badge: '11.0 µm',
    description: 'Cloud-top brightness temperature & deep convection mapping',
    wavelength: 'MODIS Band 31',
    icon: Flame,
    color: '#ea580c',
    bg: '#fff7ed',
    border: '#fed7aa',
  },
  {
    id: 'VIS/WV',
    title: 'Visible / True-Color',
    badge: '0.64 µm',
    description: 'High-res storm eye, spiraling rainbands & cloud structure',
    wavelength: 'Terra/Aqua Corrected Reflectance',
    icon: Eye,
    color: '#059669',
    bg: '#ecfdf5',
    border: '#a7f3d0',
  },
  {
    id: 'Fused View',
    title: 'Multi-Spectral Fused',
    badge: 'Dual-Sensor',
    description: 'AI coregistered TIR + Visible overlay for ConvLSTM model',
    wavelength: 'Deep Learning Ingestion',
    icon: Combine,
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
  },
];

export const ChannelSelectDropdown: React.FC<ChannelSelectDropdownProps> = ({
  selectedChannel,
  onSelectChannel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
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

  const activeChannel = CHANNELS.find((c) => c.id === selectedChannel) || CHANNELS[0];
  const ActiveIcon = activeChannel.icon;

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 14px',
          backgroundColor: isOpen ? '#f8fafc' : '#ffffff',
          border: isOpen ? '2px solid #2563eb' : '1.5px solid #cbd5e1',
          borderRadius: '12px',
          cursor: 'pointer',
          boxShadow: isOpen ? '0 0 0 4px rgba(37, 99, 235, 0.12)' : '0 1px 3px rgba(0,0,0,0.06)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          minWidth: '240px',
          textAlign: 'left',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: activeChannel.bg,
            border: `1px solid ${activeChannel.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <ActiveIcon size={18} color={activeChannel.color} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
              {activeChannel.title}
            </span>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: activeChannel.color,
                backgroundColor: activeChannel.bg,
                border: `1px solid ${activeChannel.border}`,
                padding: '1px 6px',
                borderRadius: '4px',
              }}
            >
              {activeChannel.badge}
            </span>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {activeChannel.wavelength}
          </div>
        </div>

        <ChevronDown
          size={18}
          color="#64748b"
          style={{
            transition: 'transform 0.25s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            flexShrink: 0,
          }}
        />
      </button>

      {/* Dropdown Options Popover */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            zIndex: 1050,
            width: '320px',
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 16px 40px rgba(15, 23, 42, 0.16), 0 4px 12px rgba(15, 23, 42, 0.08)',
            padding: '8px',
            animation: 'fadeInScale 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            overflow: 'hidden',
          }}
        >
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '6px 8px' }}>
            Available Spectral Observations
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {CHANNELS.map((ch) => {
              const isSelected = ch.id === selectedChannel;
              const IconComp = ch.icon;

              return (
                <div
                  key={ch.id}
                  onClick={() => {
                    onSelectChannel(ch.id);
                    setIsOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                    border: isSelected ? '1px solid #bfdbfe' : '1px solid transparent',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        backgroundColor: ch.bg,
                        border: `1px solid ${ch.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <IconComp size={16} color={ch.color} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>
                          {ch.title}
                        </span>
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            color: ch.color,
                            backgroundColor: ch.bg,
                            border: `1px solid ${ch.border}`,
                            padding: '1px 5px',
                            borderRadius: '4px',
                          }}
                        >
                          {ch.badge}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px', lineHeight: 1.3 }}>
                        {ch.description}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginLeft: '8px',
                      }}
                    >
                      <Check size={13} color="#ffffff" strokeWidth={3} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
