// frontend/src/utils/siteHelpers.ts
import { ISite } from '../types/sites';

const DEFAULT_ICON_PATH = '/icons/default-icon.png'; // A generic default icon

export const getSiteIcon = (cmsName?: string): string => {
  if (cmsName) {
    // Construct the path: /icons/cmsname.png
    // Ensure cmsName is lowercase and stripped of spaces if necessary, though your example "drupal7" is clean.
    const iconFileName = cmsName.toLowerCase().replace(/\s+/g, '') + '.png';
    return `/icons/${iconFileName}`;
  }
  return DEFAULT_ICON_PATH;
};

export const getSiteDisplayName = (site: ISite): string => {
  return site.site_name || site.cms?.name || 'Unnamed Site';
};
