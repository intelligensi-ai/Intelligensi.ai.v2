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

// Helper functions remain the same
const getSiteIcon = (siteName: string): string => {
  const icons: Record<string, string> = {
    'drupal': 'icons/drupal7.png',
    'wordpress': '/icons/wordpress.png', 
    'joomla': '/icons/joomla.png',
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
  onAddChatMessage: (message: {
    text: string;
    site?: {
      id: number;
      name: string;
      url: string;
      cms: string;
      description?: string;
    };
  }) => void;
}

const Sites: React.FC<SitesProps> = ({ 
  sites, 
  onSiteAdded, 
  onSiteUpdated,
  onAddChatMessage 
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentSite, setCurrentSite] = useState<ISite | null>(null);

  const handleEditClick = (site: ISite) => {
    setCurrentSite(site);
    setIsFormOpen(true);
  };

  const handleSave = (siteData: ISite) => {
    const isUpdate = !!currentSite;
    
    if (isUpdate) {
      onSiteUpdated({ ...currentSite, ...siteData });
    } else {
      onSiteAdded(siteData);
    }

    onAddChatMessage({
      text: `Site "${siteData.site_name}" has been ${isUpdate ? 'updated' : 'created'}`,
      site: {
        id: siteData.id || Date.now(),
        name: siteData.site_name,
        url: siteData.site_url,
        cms: siteData.cms.name,
        description: siteData.description
      }
    });

    setIsFormOpen(false);
    setCurrentSite(null);
  };

  return (
    <div className="bg-[#2D3748] p-4 border-t border-gray-700 relative">
      {/* New Site Button */}
      <button 
        onClick={() => {
          setCurrentSite(null);
          setIsFormOpen(true);
        }}
        className="absolute top-4 left-4 px-4 py-5 border-teal-200 border-2 font-extrabold bg-teal-500 hover:bg-teal-400 text-white rounded-md text-1xl flex items-center transition-colors duration-200 shadow-md"
      >
        <PlusIcon />
        <span>New Site</span>
      </button>

      {/* Sites Display */}
      <div className="flex pl-32 bg-[#2D3748]"> 
        <div className="flex overflow-x-auto flex-1 bg-[#344054] py-3 rounded-lg ml-4 border border-gray-600 shadow-sm">
          {sites.length === 0 ? (
            <div className="flex flex-1 justify-center px-2 text-gray-400 italic font-bold items-center">No sites connected</div>
          ) : (
            sites.map((site) => (
              <div 
                key={site.id} 
                className="flex py-1 flex-col items-center min-w-[90px] group cursor-pointer"
                onClick={() => handleEditClick(site)}
              >
                <img 
                  src={getSiteIcon(site.cms.name)} 
                  alt={`${site.cms.name} Logo`}
                  className="w-15 h-14 object-contain group-hover:scale-110 transition-transform duration-200"
                />
                <span className="text-xs mt-1 text-gray-300 font-bold group-hover:text-white transition-colors">
                  {getSiteDisplayName(site.cms.name)}
                </span>
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