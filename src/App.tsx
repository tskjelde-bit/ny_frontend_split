import React, { useState, useRef, useCallback, useEffect } from 'react';
import { OSLO_DISTRICTS, getPreposisjon } from '@/constants';
import { DistrictInfo } from '@/types';
import MapComponent, { MapComponentHandle, TileLayerKey, TILE_LAYERS } from '@/components/MapComponent';
import DistrictStats from '@/components/DistrictStats';
import Calculator from '@/components/Calculator';
import Header from '@/components/Header';
import RightPanel from '@/components/RightPanel';
import { ChevronDown, ChevronUp, Plus, Minus, Layers, Target, Sun, Moon, ChevronRight } from 'lucide-react';
import logoStackedDark from './assets/logo_stacked_dark.png';

const App: React.FC = () => {
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTileLayer, setActiveTileLayer] = useState<TileLayerKey>('blue');
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);
  const mapComponentRef = useRef<MapComponentHandle>(null);
  const heroTitleRef = useRef<HTMLHeadingElement>(null);

  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return !window.matchMedia('(prefers-color-scheme: light)').matches;
  });

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  const selectedDistrict = OSLO_DISTRICTS.find(d => d.id === selectedDistrictId) || null;

  const fitHeroTitle = useCallback(() => {
    const el = heroTitleRef.current;
    if (!el) return;
    const maxSize = 28; // 1.75rem mobile
    const minSize = 20;
    el.style.fontSize = '';
    el.style.whiteSpace = 'nowrap';
    if (window.innerWidth >= 768) return; // only on mobile
    el.style.fontSize = maxSize + 'px';
    let currentSize = maxSize;
    while (el.scrollWidth > el.clientWidth && currentSize > minSize) {
      currentSize -= 0.5;
      el.style.fontSize = currentSize + 'px';
    }
  }, []);

  useEffect(() => {
    requestAnimationFrame(fitHeroTitle);
  }, [selectedDistrictId, fitHeroTitle]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onResize = () => { clearTimeout(timer); timer = setTimeout(fitHeroTitle, 100); };
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); clearTimeout(timer); };
  }, [fitHeroTitle]);

  const handleDistrictSelect = (district: DistrictInfo) => {
    setSelectedDistrictId(district.id);
    setIsExpanded(true);
    setShowCalculator(false);
  };

  const handleDistrictClick = (id: string) => {
    setSelectedDistrictId(id);
    setIsExpanded(true);
    setShowCalculator(false);
  };

  const handleDistrictChangeById = (id: string) => {
    setSelectedDistrictId(id);
  };

  const toggleExpand = () => {
    if (selectedDistrictId) {
      setIsExpanded(!isExpanded);
    }
  };

  const getPanelHeightClass = () => {
    if (showCalculator) return 'h-full md:h-[640px]';
    return 'h-auto';
  };

  // Desktop Menu Items
  const navLinks = [
    { name: 'Forsiden', href: '#', active: true },
    { name: 'Kart', href: '#' },
    { name: 'Markedsrapporter', href: '#', hasDropdown: true },
    { name: 'Innsikt', href: '#' },
    { name: 'Blogg', href: '#', hasDropdown: true },
  ];

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-base text-tx-primary font-sans overflow-hidden">
      {/* Mobile/Tablet Header (Hidden on Desktop) */}
      <div className="lg:hidden">
        <Header onToggleTheme={toggleTheme} isDark={isDark} />
      </div>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative">

        {/* ==========================================
            DESKTOP LEFT COLUMN 
            - White background
            - Top Left: Menu
            - Top Right: Dark Toggle
            - Center: Logo + Button
           ========================================== */}
        <div className="hidden lg:flex flex-col w-[450px] xl:w-[500px] shrink-0 bg-base relative z-20 border-r border-br-subtle">

          {/* Top Row: Menu (Left) & Theme Toggle (Right) */}
          <div className="flex justify-between items-start p-8">
            {/* Menu */}
            <nav className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className={`text-[1rem] font-medium transition-all flex items-center gap-2 hover:text-accent ${link.active ? 'text-accent' : 'text-tx-primary'
                    }`}
                >
                  {link.name}
                  {link.hasDropdown && <ChevronDown className="w-4 h-4 opacity-50" />}
                </a>
              ))}
            </nav>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-10 h-10 rounded-full border border-br-subtle text-tx-muted hover:bg-elevated transition-all hover:text-accent"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>

          {/* Center Content: Logo & CTA */}
          <div className="flex-1 flex flex-col items-center justify-center p-8 pb-32">
            <img
              src={logoStackedDark}
              alt="Logo"
              className="w-48 h-auto mb-12"
            />

            <button className="bg-positive hover:opacity-90 text-white px-8 py-4 rounded-lg text-[0.875rem] font-bold uppercase tracking-[0.08em] transition-all active:scale-95 shadow-xl shadow-positive/20 whitespace-nowrap">
              Få verdivurdering
            </button>
          </div>
        </div>


        {/* ==========================================
            MOBILE CONTENT CONTAINER (Visible < lg)
           ========================================== */}
        <div className="lg:hidden flex flex-col flex-1 min-h-0">
          {/* Title Section (Mobile Only) */}
          <div className={`px-4 pt-2 pb-2 shrink-0 text-left ${showCalculator ? 'hidden' : 'block'}`}>
            <h1 ref={heroTitleRef} className="font-hero text-[2rem] font-extrabold text-tx-primary tracking-[-1px] leading-[1.1] mb-0.5">
              Boligmarkedet {getPreposisjon(selectedDistrict?.name)} <span className="text-accent">{selectedDistrict?.name || 'Oslo'}</span>
            </h1>
            <p className="text-tx-muted font-normal text-[0.875rem] opacity-90 leading-relaxed whitespace-nowrap overflow-hidden text-ellipsis">
              {selectedDistrict?.description || 'Er det kjøper eller selgers marked i Oslo nå?'}
            </p>
          </div>

          {/* Mobile Map Container */}
          <div className="flex-1 relative bg-elevated min-h-0">
            {/* Map rendered via portal or shared component logic below? 
                   We share the map component in the 'Right Column' div but structure it so handles both.
               */}
          </div>
        </div>


        {/* ==========================================
            RIGHT COLUMN / MAP CONTAINER (Shared/Desktop)
            - Desktop: Fills remaining space
            - Mobile: Fills remaining space in flex col
           ========================================== */}
        <div className={`flex-1 relative bg-elevated lg:border-none min-h-0 ${
          // Mobile styles are handled by the container above, but we need the map here.
          'absolute inset-0 lg:static'
          } ${''
          }`}>

          <div className={`w-full h-full relative z-0`}>
            <div className="absolute inset-0 z-0">
              <MapComponent
                ref={mapComponentRef}
                properties={[]}
                districts={OSLO_DISTRICTS}
                selectedProperty={null}
                selectedDistrict={selectedDistrict}
                onPropertySelect={() => { }}
                onDistrictSelect={handleDistrictSelect}
                isDark={isDark}
              />
            </div>

            {/* Map Controls */}
            <div className="absolute top-1/2 -translate-y-1/2 right-4 z-[500] flex flex-col gap-2 pointer-events-auto">
              {/* Controls (Zoom, Layers, etc) - Same as before */}
              <button
                onClick={() => mapComponentRef.current?.zoomIn()}
                className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center bg-white text-accent dark:bg-surface dark:text-white shadow-lg hover:bg-accent hover:text-white transition-all"
              >
                <Plus size={14} />
              </button>
              <button
                onClick={() => mapComponentRef.current?.zoomOut()}
                className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center bg-white text-accent dark:bg-surface dark:text-white shadow-lg hover:bg-accent hover:text-white transition-all"
              >
                <Minus size={14} />
              </button>
              <div className="relative mt-1 md:mt-2">
                <button
                  onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
                  className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all shadow-lg ${isLayerMenuOpen ? 'bg-accent text-white' : 'bg-white text-accent dark:bg-surface dark:text-white'
                    } hover:bg-accent hover:text-white`}
                >
                  <Layers size={14} />
                </button>
                {isLayerMenuOpen && (
                  <div className="absolute right-full mr-2 top-0 rounded-lg shadow-xl overflow-hidden border bg-base border-br-subtle" style={{ minWidth: '120px' }}>
                    {(Object.keys(TILE_LAYERS) as TileLayerKey[]).map((key) => (
                      <button
                        key={key}
                        onClick={() => {
                          mapComponentRef.current?.setTileLayer(key);
                          setActiveTileLayer(key);
                          setIsLayerMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.08em] transition-colors ${activeTileLayer === key
                          ? 'bg-accent text-white'
                          : 'text-tx-muted hover:bg-elevated'
                          }`}
                      >
                        {TILE_LAYERS[key].name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  mapComponentRef.current?.resetView();
                  setSelectedDistrictId(null);
                  setIsExpanded(false);
                }}
                className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center bg-white text-accent dark:bg-surface dark:text-white shadow-lg hover:bg-accent hover:text-white transition-all"
              >
                <Target size={14} />
              </button>
            </div>

            {/* Stats/Calculator Panel — absolute overlay at bottom of map */}
            <div className="absolute bottom-0 left-0 right-0 z-[500] pointer-events-none lg:mb-[260px] transition-all duration-300">
              {/* Added lg:mb-[260px] to push stats UP so they don't get covered by the bottom bar */}
              <div className="pointer-events-auto">
                {/* Expand/Collapse Trigger */}
                {selectedDistrictId && !showCalculator && (
                  <div className="flex justify-center mb-[-16px] md:mb-[-20px]">
                    <button
                      onClick={toggleExpand}
                      className="w-8 h-8 md:w-10 md:h-10 bg-accent border-[3px] md:border-4 border-base rounded-full flex items-center justify-center text-white hover:bg-accent-hover transition-all shadow-2xl active:scale-90 group relative z-30"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-y-0.5 transition-transform" /> : <ChevronUp className="w-4 h-4 md:w-5 md:h-5 group-hover:-translate-y-0.5 transition-transform" />}
                    </button>
                  </div>
                )}

                <div className={`overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${getPanelHeightClass()} ${selectedDistrictId ? 'bg-base' : ''
                  }`}>
                  {showCalculator && selectedDistrict ? (
                    <Calculator
                      district={selectedDistrict}
                      onDistrictChange={handleDistrictChangeById}
                      onClose={() => setShowCalculator(false)}
                    />
                  ) : (
                    <DistrictStats
                      district={selectedDistrict}
                      isExpanded={isExpanded}
                      onOpenCalculator={() => setShowCalculator(true)}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ==========================================
          DESKTOP BOTTOM BAR (Fixed Footer)
          - Dark background
          - "Siste innlegg" + 3 Articles
          - Visible only on Desktop
         ========================================== */}
      <div className="hidden lg:flex h-[260px] bg-[#0F172A] z-40 shrink-0 text-white border-t border-white/10 relative">
        {/* We can reuse logic from RightPanel or just inline the new design since it's specific */}
        <div className="flex w-full h-full">
          {/* Left Title Area */}
          <div className="w-[150px] shrink-0 p-8 pt-10 border-r border-white/10 flex flex-col justify-between">
            <h3 className="text-[0.75rem] font-bold uppercase tracking-[0.08em] opacity-70">
              Siste innlegg
            </h3>
            <a href="#" className="text-[0.75rem] font-bold text-accent hover:text-white transition-colors flex items-center gap-1">
              SE ALLE <ChevronRight className="w-3 h-3" />
            </a>
          </div>

          {/* Articles Grid */}
          <div className="flex-1 grid grid-cols-3 divide-x divide-white/10">
            {/* Article 1 */}
            <div className="p-8 hover:bg-white/5 transition-colors cursor-pointer group flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3 text-[0.6875rem] font-semibold opacity-50 tracking-[0.08em] uppercase">
                  JAN 12 <span className="w-1 h-1 bg-white rounded-full opacity-50"></span> MARKEDSINNSIKT
                </div>
                <h4 className="text-[1.25rem] font-bold leading-tight group-hover:text-accent transition-colors">
                  Boligpriser Oslo 2026–2028: Analyse av ferske prognoser
                </h4>
              </div>
            </div>

            {/* Article 2 */}
            <div className="p-8 hover:bg-white/5 transition-colors cursor-pointer group flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3 text-[0.6875rem] font-semibold opacity-50 tracking-[0.08em] uppercase">
                  JAN 05 <span className="w-1 h-1 bg-white rounded-full opacity-50"></span> MARKEDSINNSIKT
                </div>
                <h4 className="text-[1.25rem] font-bold leading-tight group-hover:text-accent transition-colors">
                  Hvordan vil utviklingen i styringsrenta påvirke boligprisene?
                </h4>
              </div>
            </div>

            {/* Article 3 (Newsletter replaced by article per sketch, or just another article) */}
            <div className="p-8 hover:bg-white/5 transition-colors cursor-pointer group flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3 text-[0.6875rem] font-semibold opacity-50 tracking-[0.08em] uppercase">
                  DES 18 <span className="w-1 h-1 bg-white rounded-full opacity-50"></span> MARKEDSINNSIKT
                </div>
                <h4 className="text-[1.25rem] font-bold leading-tight group-hover:text-accent transition-colors">
                  Oppsummering av boligåret 2025: Vinnere og tapere
                </h4>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default App;
