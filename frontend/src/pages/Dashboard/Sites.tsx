import NewSiteForm from '../../components/Sites/NewSiteForm';
import React, { useState } from 'react';
import { ISite } from '../../types/sites';

// Plus icon SVG component
const PlusIcon = () => (
  <svg 
    className="w-4 h-4 mr-1" 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M12 6v6m0 0v6m0-6h6m-6 0H6" 
    />
  </svg>
);

// External link icon SVG component
const ExternalLinkIcon = () => (
  <svg
    className="w-3 h-3 ml-1"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
    />
  </svg>
);

// Helper functions remain the same
const getSiteIcon = (siteName: string): string => {
  const icons: Record<string, string> = {
    'drupal': 'icons/drupal7.png',
    'wordpress': '/wordpress-logo.png',
    'joomla': '/joomla-logo.png',
  };
  return icons[siteName.toLowerCase()] || 'icons/drupal7.png';
};

const getSiteDisplayName = (siteName: string): string => {
  const displayNames: Record<string, string> = {
    'drupal': 'Drupal',
    'wordpress': 'WordPress',
    'joomla': 'Joomla',
  };
  return displayNames[siteName.toLowerCase()] || siteName;
};

interface SitesProps {
  sites: ISite[];
  onSiteAdded: (newSite: ISite) => void;
  onSiteUpdated: (updatedSite: ISite) => void;
}

const Sites: React.FC<SitesProps> = ({ sites, onSiteAdded, onSiteUpdated }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentSite, setCurrentSite] = useState<ISite | null>(null);

  const handleEditClick = (site: ISite) => {
    setCurrentSite(site);
    setIsFormOpen(true);
  };

  const handleSave = (siteData: ISite) => {
    if (currentSite) {
      // Update existing site
      onSiteUpdated({ ...currentSite, ...siteData });
    } else {
      // Add new site
      onSiteAdded(siteData);
    }
    setIsFormOpen(false);
    setCurrentSite(null);
  };

  const handleSiteClick = (site: ISite) => {
    if (site.site_url) {
      window.open(site.site_url, '_blank');
    } else {
      handleEditClick(site);
    }
  };

  return (
    <div className="bg-[#2D3748] p-4 border-t border-gray-700 relative">
      {/* New Site Button */}
      <button 
        onClick={() => {
          setCurrentSite(null);
          setIsFormOpen(true);
        }}
        className="absolute top-4 left-4 px-4 py-3 border-teal-200 border-2 font-extrabold bg-teal-500 hover:bg-teal-400 text-white rounded-md text-1xl flex items-center transition-colors duration-200 shadow-md"
      >
        <PlusIcon />
        <span>New Site</span>
      </button>

      {/* Sites Display */}
      <div className="flex pl-32 bg-[#2D3748]"> 
        <div className="flex overflow-x-auto flex-1 bg-[#344054] py-3 rounded-lg ml-4 border border-gray-600 shadow-sm">
          {sites.length === 0 ? (
            <div className="text-gray-400 italic flex items-center">No sites connected</div>
          ) : (
            sites.map((site) => (
              <div 
                key={site.id} 
                className="flex py-1 flex-col items-center min-w-[90px] group cursor-pointer"
                onClick={() => handleSiteClick(site)}
              >
                <img 
                  src={getSiteIcon(site.cms.name)} 
                  alt={`${site.cms.name} Logo`}
                  className="w-15 h-14 object-contain group-hover:scale-110 transition-transform duration-200"
                />
                <span className="text-xs mt-1 text-gray-300 font-bold group-hover:text-white transition-colors">
                  {getSiteDisplayName(site.cms.name)}
                </span>
                {site.site_url && (
                  <div className="flex items-center mt-1 text-xs text-blue-300 group-hover:text-blue-200">
                    <span className="truncate max-w-[80px]">{new URL(site.site_url).hostname}</span>
                    <ExternalLinkIcon />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        
        {/* Connected Sites */}
        <div className="bg-[#2D3748] px-4 py-2 rounded-lg ml-4 border border-gray-600 shadow-sm">
          <h3 className="font-semibold mb-1 text-gray-100">Connected Sites</h3>
          <div className="text-sm text-blue-300 font-medium">
            {sites.length} site{sites.length !== 1 ? 's' : ''} connected
          </div>
        </div>
      </div>

      {/* Site Form (for both create and edit) */}
      <NewSiteForm 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
        initialData={currentSite}
      />
    </div>
  );
};

export default Sites;