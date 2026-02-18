import React, { useState, useRef, useCallback, useEffect } from 'react';
import { OSLO_DISTRICTS, getPreposisjon } from '@/constants';
import { DistrictInfo } from '@/types';
import MapComponent, { MapComponentHandle, TileLayerKey, TILE_LAYERS } from '@/components/MapComponent';
import DistrictStats from '@/components/DistrictStats';
import Calculator from '@/components/Calculator';
import Header from '@/components/Header';
import RightPanel from '@/components/RightPanel';
import { ChevronDown, ChevronUp, Plus, Minus, Layers, Target, Sun, Moon } from 'lucide-react';
import logoStackedDark from '@/assets/logo_stacked_dark.png';

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

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">

        {/* LEFT COLUMN (Desktop: Scrollable Content, Mobile: Content below map if needed, but per design mobile is stacked differently) 
            Actually, for Mobile, the original order was Header -> Title -> Map -> RightPanel(hidden or below).
            We need to maintain the "Mobile side er uendret" requirement.
            
            Structure for Desktop Split:
            Left (40% / Fixed width): Logo, Menu, Title, Description, RightPanel Content.
            Right (Rest): Map.
        */}

        {/* PROPOSED STRUCTURE:
            Mobile (< lg): 
              - Header (Already rendered above)
              - Content Container (Title, Map, etc matching original)
            
            Desktop (>= lg):
              - Left Col: Logo, Menu, Title, RightPanel Content
              - Right Col: Map
        */}

        {/* Left Column (Desktop) / Main Content Wrapper */}
        <div className="lg:w-[450px] xl:w-[500px] shrink-0 flex flex-col bg-base lg:border-r lg:border-br-subtle overflow-y-auto z-10">

          {/* Desktop Logo & Menu */}
          <div className="hidden lg:flex flex-col px-8 pt-8 pb-4">
            {/* Logo */}
            <div className="mb-8">
              <img
                src={logoStackedDark}
                alt="Logo"
                className="h-12 w-auto"
              />
            </div>

            {/* Vertical Menu */}
            <nav className="flex flex-col gap-4 mb-8">
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

            {/* Theme Toggle Desktop */}
            <div className="mb-8">
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 text-tx-muted hover:text-accent transition-colors"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                <span className="text-sm font-medium uppercase tracking-wider">
                  {isDark ? 'Lys modus' : 'Mørk modus'}
                </span>
              </button>
            </div>
          </div>

          {/* Title Section (Shared but styled differently) */}
          <div className={`px-4 md:px-14 lg:px-8 pt-2 md:pt-10 lg:pt-0 pb-2 md:pb-6 lg:pb-8 shrink-0 text-left ${showCalculator && !isExpanded ? 'hidden md:block' : 'block'}`}>
            <h1 ref={heroTitleRef} className="font-hero text-[2rem] md:text-[3rem] font-extrabold text-tx-primary tracking-[-1px] leading-[1.1] mb-0.5 md:mb-2">
              Boligmarkedet {getPreposisjon(selectedDistrict?.name)} <span className="text-accent">{selectedDistrict?.name || 'Oslo'}</span>
            </h1>
            <p className="text-tx-muted font-normal text-[0.875rem] md:text-[0.9375rem] opacity-90 leading-relaxed lg:whitespace-normal whitespace-nowrap overflow-hidden text-ellipsis">
              {selectedDistrict?.description || 'Er det kjøper eller selgers marked i Oslo nå?'}
            </p>
          </div>

          {/* Mobile Map Placeholder (Only visible on mobile/tablet) */}
          <div className="lg:hidden flex-1 min-h-0 flex flex-col relative">
            {/* This div mimics the mobile structure where map takes remaining space */}
            {/* However, we can't duplicate the MapComponent ID easily. 
                 We will use CSS Grid order or absolute positioning to handle layout changes 
                 OR render the map in a portal/shared container if possible.
                 
                 Easier approach: 
                 Use a single Map Container that changes position via CSS Grid.
             */}
          </div>

          {/* Content from RightPanel (Now in Left Column on Desktop, Hidden on Mobile/Tablet if it was hidden before?)
              Original: RightPanel was hidden on < lg. 
              "RightPanel content... should be moved... to the left column".
          */}
          <div className="hidden lg:block px-8 py-4">
            <RightPanel className="!p-0 !h-auto !bg-transparent !overflow-visible shadow-none border-none" />
          </div>

        </div>

        {/* Right Column (Map) - Desktop: Col 2, Mobile: Order 2 */}
        {/* We use a Grid for providing the map to both layouts seamlessly if possible, 
            or we just make this the flex-1 container.
        */}
        <div className={`flex-1 relative bg-elevated lg:border-none md:border md:border-br-default shadow-2xl lg:shadow-none min-h-0 order-first lg:order-last ${
          // Mobile specific sizing adjustments
          'h-full'
          }`}>
          {/* Map — fills entire container */}
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
          <div className="absolute bottom-0 left-0 right-0 z-[500] pointer-events-none">
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
  );
};

export default App;
