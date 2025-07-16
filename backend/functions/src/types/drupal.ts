// Drupal node type definition
export interface DrupalNode {
  id: string;
  type: string;
  attributes: {
    title: string;
    body?: {
      value: string;
      format: string;
    };
    [key: string]: unknown;
  };
  relationships?: {
    [key: string]: unknown;
  };
}

export interface DrupalResponse<T = unknown> {
  data: T;
  included?: unknown[];
  links?: {
    [key: string]: {
      href: string;
    };
  };
  meta?: {
    count: number;
  };
}

export interface DrupalError {
  status: string;
  title: string;
  detail?: string;
  source?: {
    pointer?: string;
    parameter?: string;
  };
}
