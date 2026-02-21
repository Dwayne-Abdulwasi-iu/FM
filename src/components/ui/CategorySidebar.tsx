import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface Category {
  id: string;
  name: string;
  slug: string;
  children?: Category[];
}

interface Props {
  categories: Category[];
  selected: string | null;
  onSelect: (slug: string | null) => void;
  onParentExpanded?: (parentSlug: string | null) => void;
  isOverlay?: boolean;
}

// Category emoji mapping
const getCategoryEmoji = (name: string): string => {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes('dress')) return '👗';
  if (lowerName.includes('handbag') || lowerName.includes('bag')) return '👜';
  if (lowerName.includes('watch')) return '⌚';
  if (lowerName.includes('ankara') || lowerName.includes('fabric')) return '🎨';
  if (lowerName.includes('heel') || lowerName.includes('shoe') || lowerName.includes('footwear')) return '👞';
  if (lowerName.includes('hair extension') || lowerName.includes('wig')) return '💇‍♀️';
  if (lowerName.includes('perfume') || lowerName.includes('scent')) return '🧴';
  if (lowerName.includes('shampoo') || lowerName.includes('hair care')) return '✨';
  if (lowerName.includes('conditioner')) return '🧴';
  if (lowerName.includes('flat')) return '🥾';
  if (lowerName.includes('body')) return '🧴';
  if (lowerName.includes('accessorie')) return '💎';
  if (lowerName.includes('beauty') || lowerName.includes('fragrance')) return '💄';
  if (lowerName.includes('traditional') || lowerName.includes('native') || lowerName.includes('ankara')) return '👗';
  if (lowerName.includes('hair') && !lowerName.includes('care')) return '💇‍♀️';
  if (lowerName.includes('clothing') || lowerName.includes('wear')) return '👕';
  
  // Default fallback
  return '✨';
};

export const CategorySidebar: React.FC<Props> = ({ categories, selected, onSelect, onParentExpanded, isOverlay = false }) => {
  const [expanded, setExpanded] = useState<string | null>(null);

  // Filter to only show true parent categories (not children of other categories)
  const getParentCategoriesOnly = () => {
    const allChildIds = new Set<string>();
    categories.forEach(cat => {
      if (cat.children && cat.children.length > 0) {
        cat.children.forEach(child => {
          allChildIds.add(child.id);
        });
      }
    });
    return categories.filter(cat => !allChildIds.has(cat.id));
  };

  const parentCategoriesOnly = getParentCategoriesOnly();

  const handleParentClick = (slug: string) => {
    // Toggle expansion and notify parent component
    const newExpanded = expanded === slug ? null : slug;
    setExpanded(newExpanded);
    onParentExpanded?.(newExpanded);
  };

  const handleChildClick = (childSlug: string) => {
    onSelect(childSlug);
  };

  return (
    <aside className={`w-full bg-gradient-to-b from-purple-50 via-pink-50 to-purple-50 border-r border-purple-200 ${isOverlay ? '' : 'lg:w-56 rounded-lg shadow-sm p-4 sticky top-24 lg:top-20'} ${isOverlay ? 'h-full overflow-y-auto p-4 sm:p-6' : ''}`}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xs tracking-widest font-bold uppercase text-purple-900 mb-0.5">Shop by</h2>
        <div className="h-1 w-16 bg-gradient-to-r from-purple-600 to-pink-500 rounded-full"></div>
      </div>

      {/* All Categories Button */}
      <button
        onClick={() => {
          onSelect(null);
          setExpanded(null);
        }}
        className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 mb-4 border-2 ${
          !selected 
            ? 'bg-white border-purple-600 text-purple-700 shadow-md' 
            : 'border-purple-200 text-gray-700 hover:border-purple-400 hover:bg-white'
        }`}
      >
        ✨ All Categories
      </button>

      {/* Parent Categories Only - Filtered to exclude children */}
      <div className="space-y-2">
        {parentCategoriesOnly.map((parent) => (
          <div key={parent.id}>
            <button
              onClick={() => handleParentClick(parent.slug)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm transition-all duration-200 border-l-4 mb-1 group ${
                selected === parent.slug
                  ? 'bg-white border-l-pink-500 text-pink-700 font-semibold shadow-md'
                  : 'border-l-transparent text-gray-700 hover:bg-white hover:border-l-purple-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-lg opacity-70 group-hover:opacity-100 transition-opacity">
                  {getCategoryEmoji(parent.name)}
                </span>
                {parent.name}
              </span>
              {parent.children && parent.children.length > 0 && (
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-300 ${
                    expanded === parent.slug ? 'rotate-180' : ''
                  }`}
                />
              )}
            </button>

            {/* Children Categories - Only show when parent is expanded */}
            {expanded === parent.slug && parent.children && parent.children.length > 0 && (
              <div className="ml-4 mb-3 bg-white rounded-lg p-3 border border-purple-200 shadow-sm">
                <button
                  onClick={() => {
                    onSelect(parent.slug);
                  }}
                  className={`w-full text-left px-3 py-2 rounded text-xs font-semibold transition-all duration-200 mb-2 border-b-2 pb-2 ${
                    selected === parent.slug
                      ? 'border-b-pink-500 text-pink-700'
                      : 'border-b-purple-200 text-gray-700 hover:text-purple-700'
                  }`}
                >
                  View All {parent.name}
                </button>
                <div className="space-y-1">
                  {parent.children.map(child => (
                    <button
                      key={child.id}
                      onClick={() => handleChildClick(child.slug)}
                      className={`w-full text-left px-3 py-2 rounded text-xs transition-all duration-200 flex items-center gap-2 group ${
                        selected === child.slug
                          ? 'bg-purple-100 text-purple-700 font-semibold'
                          : 'text-gray-600 hover:text-purple-700 hover:bg-purple-50'
                      }`}
                    >
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                      {child.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer Divider */}
      <div className="mt-6 pt-4 border-t border-purple-200">
        <p className="text-xs text-purple-600 text-center italic opacity-70">Curated Fashion</p>
      </div>
    </aside>
  );
};
