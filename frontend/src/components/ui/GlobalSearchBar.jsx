import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, ChevronDown, User, HeartPulse, Stethoscope, FileText, CreditCard, Ambulance, Home, Loader2, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axiosInstance';
import toast from 'react-hot-toast';

export default function GlobalSearchBar({ role = 'user' }) {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('all');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [showCategories, setShowCategories] = useState(false);
    
    const wrapperRef = useRef(null);
    const catRef = useRef(null);

    // Debounce timer
    const debounceTimeout = useRef(null);

    const categories = [
        { id: 'all', label: 'All', icon: <Search size={14} /> },
        { id: 'users', label: 'Users', icon: <User size={14} /> },
        { id: 'doctors', label: 'Doctors', icon: <Stethoscope size={14} /> },
        { id: 'pets', label: 'Pets', icon: <HeartPulse size={14} /> },
        { id: 'shelters', label: 'Shelters', icon: <Home size={14} /> },
        role === 'admin' && { id: 'prescriptions', label: 'Prescriptions', icon: <FileText size={14} /> },
        role === 'admin' && { id: 'consultations', label: 'Emergencies', icon: <Ambulance size={14} /> },
        role === 'admin' && { id: 'payments', label: 'Payments', icon: <CreditCard size={14} /> }
    ].filter(Boolean);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target) && catRef.current && !catRef.current.contains(event.target)) {
                setIsOpen(false);
                setShowCategories(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchResults = useCallback(async (searchQuery, searchCategory) => {
        if (!searchQuery || searchQuery.trim().length < 2) {
            setResults([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const { data } = await api.get(`/api/core/search/?q=${encodeURIComponent(searchQuery)}&category=${encodeURIComponent(searchCategory)}`);
            setResults(data.results || []);
            setIsOpen(true);
        } catch (error) {
            console.error('Search error:', error);
            if (error.response?.status === 400) {
                toast.error('Invalid search characters detected.');
            }
        } finally {
            setLoading(false);
        }
    }, [role]);

    useEffect(() => {
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }

        if (query.trim().length >= 2) {
            debounceTimeout.current = setTimeout(() => {
                fetchResults(query, category);
            }, 400); // 400ms debounce
        } else {
            setResults([]);
            setIsOpen(false);
        }

        return () => clearTimeout(debounceTimeout.current);
    }, [query, category, fetchResults]);

    const handleResultClick = (link) => {
        setIsOpen(false);
        setQuery('');
        
        // Handle admin links differently if needed, but navigate natively supports relative paths
        if (link.startsWith('/admin/')) {
            // It's a standard Django Admin link
            window.location.href = link;
        } else {
            // It's a React Router link
            navigate(link);
        }
    };

    // Helper to highlight matching substrings
    const highlightMatch = (text, term) => {
        if (!term || !text) return text;
        const regex = new RegExp(`(${term})`, 'gi');
        const parts = text.toString().split(regex);
        return parts.map((part, i) => 
            regex.test(part) ? <span key={i} style={{ color: 'var(--orange-500)', fontWeight: 800 }}>{part}</span> : part
        );
    };

    const activeCat = categories.find(c => c.id === category);

    return (
        <div className="global-search-wrapper" ref={wrapperRef} style={{ position: 'relative', width: '100%', maxWidth: '400px', zIndex: 100 }}>
            {/* Input Container */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-full)',
                padding: '4px 6px',
                paddingLeft: '16px',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02), 0 2px 10px rgba(0,0,0,0.03)',
                transition: 'all 0.3s ease',
            }}>
                <Search size={18} color="var(--gray-400)" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search global ecosystem..."
                    style={{
                        flex: 1,
                        border: 'none',
                        outline: 'none',
                        background: 'transparent',
                        padding: '8px 12px',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        color: 'var(--text-main)',
                    }}
                    onFocus={() => { if (query.trim().length >= 2) setIsOpen(true) }}
                />
                
                {/* Category Selector Dropdown Trigger */}
                <div 
                    ref={catRef}
                    onClick={() => setShowCategories(!showCategories)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        background: 'var(--gray-50)',
                        border: '1px solid var(--border-light)',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--gray-600)',
                        cursor: 'pointer',
                        userSelect: 'none',
                    }}
                >
                    {activeCat?.label} <ChevronDown size={12} />
                </div>
            </div>

            {/* Category Dropdown Content */}
            {showCategories && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: '0',
                    background: 'white',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-lg)',
                    padding: '8px 0',
                    width: '180px',
                    zIndex: 101,
                    overflow: 'hidden'
                }}>
                    {categories.map(c => (
                        <div 
                            key={c.id} 
                            onClick={() => { setCategory(c.id); setShowCategories(false); }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 16px',
                                cursor: 'pointer',
                                transition: 'var(--transition)',
                                background: category === c.id ? 'var(--orange-50)' : 'transparent',
                                color: category === c.id ? 'var(--orange-600)' : 'var(--gray-600)',
                                fontWeight: category === c.id ? 800 : 600,
                                fontSize: '0.8rem',
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'var(--gray-50)'}
                            onMouseOut={(e) => e.currentTarget.style.background = category === c.id ? 'var(--orange-50)' : 'transparent'}
                        >
                            {c.icon} {c.label}
                        </div>
                    ))}
                </div>
            )}

            {/* Results Dropdown */}
            {isOpen && query.trim().length >= 2 && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: 0,
                    right: 0,
                    background: 'rgba(255, 255, 255, 0.98)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    zIndex: 100,
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                }}>
                    {loading ? (
                        <div style={{ padding: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--gray-400)', gap: '8px', fontSize: '0.85rem' }}>
                            <Loader2 className="animate-spin" size={16} /> Fetching results...
                        </div>
                    ) : results.length > 0 ? (
                        results.map((item, idx) => (
                            <div 
                                key={`${item.type}-${item.id}-${idx}`}
                                onClick={() => handleResultClick(item.link)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '12px',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    border: '1px solid transparent',
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = 'var(--gray-50)';
                                    e.currentTarget.style.borderColor = 'var(--border-light)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.borderColor = 'transparent';
                                }}
                            >
                                <div style={{ 
                                    minWidth: '40px', 
                                    height: '40px', 
                                    background: 'var(--orange-50)', 
                                    color: 'var(--orange-500)', 
                                    borderRadius: '50%', 
                                    display: 'flex', 
                                    justifyContent: 'center', 
                                    alignItems: 'center',
                                    marginRight: '12px'
                                }}>
                                    {item.type === 'user' && <User size={18} />}
                                    {item.type === 'doctor' && <Stethoscope size={18} />}
                                    {item.type === 'pet' && <HeartPulse size={18} />}
                                    {item.type === 'shelter' && <Home size={18} />}
                                    {item.type === 'prescription' && <FileText size={18} />}
                                    {item.type === 'consultation' && <Ambulance size={18} />}
                                    {item.type === 'payment' && <CreditCard size={18} />}
                                    {!['user', 'doctor', 'pet', 'shelter', 'prescription', 'consultation', 'payment'].includes(item.type) && <Search size={18} />}
                                </div>
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                        <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--gray-800)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {highlightMatch(item.title, query)}
                                        </h4>
                                        <span style={{ 
                                            fontSize: '0.65rem', 
                                            padding: '2px 8px', 
                                            borderRadius: '10px', 
                                            background: 'var(--gray-100)', 
                                            color: 'var(--gray-600)', 
                                            fontWeight: 800,
                                            textTransform: 'uppercase'
                                        }}>
                                            {item.badge}
                                        </span>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--gray-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {highlightMatch(item.subtitle, query)}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={{ padding: '30px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--gray-400)' }}>
                            <div style={{ padding: '16px', background: 'var(--gray-50)', borderRadius: '50%' }}>
                                <Search size={24} color="var(--gray-400)" />
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--gray-600)', marginBottom: '4px' }}>No matches found</p>
                                <p style={{ fontSize: '0.75rem' }}>We couldn't find anything matching "{query}"</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
