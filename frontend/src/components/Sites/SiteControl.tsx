import React from 'react';
import { ISite } from '../../types/sites';
import { ArrowPathIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

// Helper functions (can be moved to a shared util file if used elsewhere)
const getSiteIcon = (siteName: string): string => {
  const icons: Record<string, string> = {
    'drupal': '/icons/drupal7.png', // Assuming icons are in public/icons
    'wordpress': '/icons/wordpress.png',
    'joomla': '/icons/joomla.png',
  };
  return icons[siteName.toLowerCase()] || '/icons/drupal7.png'; // Default icon
};

const getSiteDisplayName = (siteName: string): string => {
  const displayNames: Record<string, string> = {
    'drupal': 'Drupal',
    'wordpress': 'WordPress',
    'joomla': 'Joomla',
  };
  return displayNames[siteName.toLowerCase()] || siteName;
};

export interface SiteControlProps {
  site: ISite;
  isSelected: boolean;
  onSelect: (siteId: number) => void;
  onRemove: (site: ISite) => void;
  onViewContent: (site: ISite) => void;
  onVectorizeContent: (site: ISite) => void;
  schemaError?: string | null;
  vectorizeStatus?: 'processing' | 'complete' | 'error' | null;
  isVectorizing: boolean; // To manage button disabled state during vectorization
}

const SiteControl: React.FC<SiteControlProps> = ({
  site,
  isSelected,
  onSelect,
  onRemove,
  onViewContent,
  onVectorizeContent,
  schemaError,
  vectorizeStatus,
  isVectorizing,
}) => {
  const siteIcon = getSiteIcon(site.cms.name);
  const siteDisplayName = getSiteDisplayName(site.cms.name);

  return (
    <div 
      key={site.id} 
      className={`p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer mb-4 ${isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50' : 'bg-white'}`}
      onClick={() => onSelect(site.id)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <img src={siteIcon} alt={siteDisplayName} className="w-10 h-10 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{site.site_name}</h3>
            <p className="text-sm text-gray-500">{site.site_url}</p>
            <p className="text-xs text-gray-400">CMS: {siteDisplayName}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* Status Icons */}
          {schemaError && site.id === (isSelected ? site.id : undefined) && (
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500" title={`Schema Error: ${schemaError}`} />
          )}
          {vectorizeStatus === 'processing' && site.id === (isSelected ? site.id : undefined) && (
            <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin" title="Vectorizing..." />
          )}
          {vectorizeStatus === 'complete' && site.id === (isSelected ? site.id : undefined) && (
            <CheckCircleIcon className="w-5 h-5 text-green-500" title="Vectorization Complete" />
          )}
          {vectorizeStatus === 'error' && site.id === (isSelected ? site.id : undefined) && (
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500" title="Vectorization Error" />
          )}
        </div>
      </div>

      {/* Action Buttons - Shown when the site is selected */}
      {isSelected && (
        <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap gap-2 items-center">
          <button
            onClick={(e) => { e.stopPropagation(); onViewContent(site); }}
            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={!site.schema_id || isVectorizing}
            title={!site.schema_id ? "Schema must be generated first" : "View site content structure"}
          >
            View Content
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onVectorizeContent(site); }}
            className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            disabled={!site.schema_id || isVectorizing}
            title={!site.schema_id ? "Schema must be generated first" : "Vectorize site content"}
          >
            {isVectorizing ? 'Vectorizing...' : 'Vectorize Content'}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(site); }}
            className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Remove Site
          </button>
          {!site.schema_id && (
            <p className="text-xs text-orange-600 ml-2">
              <ExclamationTriangleIcon className="w-4 h-4 inline mr-1" />
              Site schema not found. Please ensure the schema is generated.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default SiteControl;
