'use client';

import React from 'react';

const ColorTest = () => {
  // Custom colors from tailwind config
  const customColors = [
    { name: 'palm-green', hex: '#3E7A4E', description: 'lush tropical foliage' },
    { name: 'forest-green', hex: '#2E6E49', description: 'vibrant energy pop' },
    { name: 'british-racing-green', hex: '#16442D', description: '' },
    { name: 'dark-spring-green', hex: '#227D54', description: '' },
    { name: 'plantain-green', hex: '#5CAB68', description: '' },
    { name: 'tea-green', hex: '#C8D5B9', description: '' },
    { name: 'sand-beige', hex: '#E8D4B8', description: 'soft neutral base' },
    { name: 'golden-sand', hex: '#F4C47A', description: 'warm, glowing accent' },
    { name: 'cocoa-brown', hex: '#6B3E2E', description: 'deep, grounding tone' },
    { name: 'terracotta-red', hex: '#D94E2B', description: 'softer gradient tone' },
    { name: 'engineering-orange', hex: '#BC2C1A', description: 'light tropical breeze' },
    { name: 'moonstone', hex: '#53A2BE', description: '' },
    { name: 'blue-ncs', hex: '#1D84B5', description: '' },
    { name: 'lime', hex: '#D2FF28', description: '' },
    { name: 'carrot-orange', hex: '#EA9010', description: '' },
    { name: 'giants-orange', hex: '#F05D23', description: '' },
    { name: 'lighter-brown', hex: '#D2A267', description: '' },
    { name: 'highlight-brown', hex: '#A97453', description: '' },
    // { name: '1another-brown', hex: '#B08154', description: '' },
    // { name: '2another-dark-brown', hex: '#8D6041', description: '' },
    // { name: '3highlight-brown', hex: '#B97A56', description: '' },
  ];

  // DaisyUI theme colors
  const themeColors = [
    { name: 'primary', hex: '#FF6B35', description: 'mango-orange' },
    { name: 'secondary', hex: '#3E7A4E', description: 'palm-green' },
    { name: 'accent', hex: '#F4C47A', description: 'golden-sand' },
    { name: 'neutral', hex: '#6B3E2E', description: 'cocoa-brown' },
    { name: 'base-100', hex: '#E8D4B8', description: 'sand-beige' },
    { name: 'info', hex: '#CFE0D6', description: 'sea-mist' },
    { name: 'success', hex: '#3E7A4E', description: '' },
    { name: 'warning', hex: '#F4C47A', description: '' },
    { name: 'error', hex: '#FF886A', description: '' },
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const ColorCard = ({ name, hex, description, prefix = '' }: { name: string; hex: string; description: string; prefix?: string }) => {
    const textColor = isLightColor(hex) ? 'text-gray-900' : 'text-white';
    const fullName = prefix ? `${prefix}-${name}` : name;
    
    return (
      <div className="border border-gray-300 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
        <div 
          className={`h-32 flex items-center justify-center ${textColor} cursor-pointer hover:opacity-90 transition-opacity`}
          style={{ backgroundColor: hex }}
          onClick={() => copyToClipboard(hex)}
          title="Click to copy hex code"
        >
          <div className="text-center">
            <div className="font-bold text-lg">{hex.toUpperCase()}</div>
            <div className="text-sm mt-1">Click to copy</div>
          </div>
        </div>
        <div className="p-4 bg-white">
          <h3 className="font-semibold text-gray-800 mb-1">{fullName}</h3>
          <p className="text-sm text-gray-600 mb-2">
            <code className="bg-gray-100 px-2 py-1 rounded text-xs">
              {prefix ? `bg-${fullName}` : `${fullName}`}
            </code>
          </p>
          {description && (
            <p className="text-xs text-gray-500 italic">{description}</p>
          )}
        </div>
      </div>
    );
  };

  // Helper function to determine if color is light or dark
  const isLightColor = (hex: string) => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luma > 128;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Family Connect Color Palette
          </h1>
          <p className="text-lg text-gray-600">
            Click on any color to copy its hex code
          </p>
        </div>

        {/* Custom Colors Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-semibold text-gray-800 mb-6">
            Custom Colors
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {customColors.map((color) => (
              <ColorCard
                key={color.name}
                name={color.name}
                hex={color.hex}
                description={color.description}
              />
            ))}
          </div>
        </section>

        {/* DaisyUI Theme Colors Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-semibold text-gray-800 mb-6">
            DaisyUI Theme Colors
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {themeColors.map((color) => (
              <ColorCard
                key={color.name}
                name={color.name}
                hex={color.hex}
                description={color.description}
              />
            ))}
          </div>
        </section>

        {/* Color Combinations Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-semibold text-gray-800 mb-6">
            Color Combinations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Combination 1: Primary + Secondary */}
            <div className="border border-gray-300 rounded-lg overflow-hidden shadow-md">
              <div className="flex h-32">
                <div className="flex-1 bg-[#FF6B35] flex items-center justify-center text-white font-bold">
                  Primary
                </div>
                <div className="flex-1 bg-[#3E7A4E] flex items-center justify-center text-white font-bold">
                  Secondary
                </div>
              </div>
              <div className="p-4 bg-white">
                <h3 className="font-semibold text-gray-800">Primary + Secondary</h3>
                <p className="text-sm text-gray-600">Main brand combination</p>
              </div>
            </div>

            {/* Combination 2: Accent + Neutral */}
            <div className="border border-gray-300 rounded-lg overflow-hidden shadow-md">
              <div className="flex h-32">
                <div className="flex-1 bg-[#F4C47A] flex items-center justify-center text-gray-900 font-bold">
                  Accent
                </div>
                <div className="flex-1 bg-[#6B3E2E] flex items-center justify-center text-white font-bold">
                  Neutral
                </div>
              </div>
              <div className="p-4 bg-white">
                <h3 className="font-semibold text-gray-800">Accent + Neutral</h3>
                <p className="text-sm text-gray-600">Warm contrast</p>
              </div>
            </div>

            {/* Combination 3: All Greens */}
            <div className="border border-gray-300 rounded-lg overflow-hidden shadow-md">
              <div className="flex h-32">
                <div className="flex-1 bg-[#3E7A4E] flex items-center justify-center text-white text-xs font-bold">
                  Palm
                </div>
                <div className="flex-1 bg-[#2E6E49] flex items-center justify-center text-white text-xs font-bold">
                  Forest
                </div>
                <div className="flex-1 bg-[#16442D] flex items-center justify-center text-white text-xs font-bold">
                  Racing
                </div>
                <div className="flex-1 bg-[#227D54] flex items-center justify-center text-white text-xs font-bold">
                  Spring
                </div>
              </div>
              <div className="p-4 bg-white">
                <h3 className="font-semibold text-gray-800">Green Spectrum</h3>
                <p className="text-sm text-gray-600">Nature-inspired tones</p>
              </div>
            </div>

            {/* Combination 4: Warm Tones */}
            <div className="border border-gray-300 rounded-lg overflow-hidden shadow-md">
              <div className="flex h-32">
                <div className="flex-1 bg-[#F4C47A] flex items-center justify-center text-gray-900 text-xs font-bold">
                  Golden
                </div>
                <div className="flex-1 bg-[#EA9010] flex items-center justify-center text-white text-xs font-bold">
                  Carrot
                </div>
                <div className="flex-1 bg-[#F05D23] flex items-center justify-center text-white text-xs font-bold">
                  Giants
                </div>
                <div className="flex-1 bg-[#D94E2B] flex items-center justify-center text-white text-xs font-bold">
                  Terra
                </div>
              </div>
              <div className="p-4 bg-white">
                <h3 className="font-semibold text-gray-800">Warm Orange Spectrum</h3>
                <p className="text-sm text-gray-600">Vibrant energy tones</p>
              </div>
            </div>
          </div>
        </section>

        {/* Gradient Examples */}
        <section>
          <h2 className="text-3xl font-semibold text-gray-800 mb-6">
            Gradient Examples
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-gray-300 rounded-lg overflow-hidden shadow-md">
              <div 
                className="h-32 flex items-center justify-center text-white font-bold"
                style={{ 
                  background: 'linear-gradient(135deg, #FF6B35 0%, #3E7A4E 100%)' 
                }}
              >
                Primary to Secondary
              </div>
              <div className="p-4 bg-white">
                <code className="text-xs bg-gray-100 px-2 py-1 rounded block">
                  bg-gradient-to-r from-[#FF6B35] to-[#3E7A4E]
                </code>
              </div>
            </div>

            <div className="border border-gray-300 rounded-lg overflow-hidden shadow-md">
              <div 
                className="h-32 flex items-center justify-center text-white font-bold"
                style={{ 
                  background: 'linear-gradient(135deg, #F4C47A 0%, #D94E2B 100%)' 
                }}
              >
                Golden to Terracotta
              </div>
              <div className="p-4 bg-white">
                <code className="text-xs bg-gray-100 px-2 py-1 rounded block">
                  bg-gradient-to-r from-[#F4C47A] to-[#D94E2B]
                </code>
              </div>
            </div>

            <div className="border border-gray-300 rounded-lg overflow-hidden shadow-md">
              <div 
                className="h-32 flex items-center justify-center text-white font-bold"
                style={{ 
                  background: 'linear-gradient(135deg, #53A2BE 0%, #1D84B5 100%)' 
                }}
              >
                Moonstone to Blue
              </div>
              <div className="p-4 bg-white">
                <code className="text-xs bg-gray-100 px-2 py-1 rounded block">
                  bg-gradient-to-r from-[#53A2BE] to-[#1D84B5]
                </code>
              </div>
            </div>

            <div className="border border-gray-300 rounded-lg overflow-hidden shadow-md">
              <div 
                className="h-32 flex items-center justify-center text-gray-900 font-bold"
                style={{ 
                  background: 'linear-gradient(135deg, #E8D4B8 0%, #C8D5B9 100%)' 
                }}
              >
                Sand to Tea Green
              </div>
              <div className="p-4 bg-white">
                <code className="text-xs bg-gray-100 px-2 py-1 rounded block">
                  bg-gradient-to-r from-[#E8D4B8] to-[#C8D5B9]
                </code>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ColorTest;

