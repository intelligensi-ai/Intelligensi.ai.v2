export interface ContentNode {
  nid: string;
  type?: string;
  bundle?: string;
  title?: string;
  created?: string;
  changed?: string;
  body?: string | { processed?: string; value?: string } | unknown;
  [key: string]: unknown;
}

export interface ExtendedContentNode extends Omit<ContentNode, 'body'> {
  id: string;
  changed: string;
  body: string | { processed?: string; value?: string } | unknown;
}

import { ISite } from './sites';

export interface WebsitePreviewProps {
  site: {
    id?: string | number;
    site_name: string;
    site_url: string;
  } | ISite;
  onClose: () => void;
}