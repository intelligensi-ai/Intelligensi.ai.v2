/**
 * Type definitions for Drupal content creation
 */

export type UnknownRec = Record<string, unknown>;

export interface MediaResponse {
  media_id?: string | number;
  id?: string | number;
  alt?: string;
  title?: string;
  data?: {
    id?: string | number;
    alt?: string;
    title?: string;
  };
}

export interface ContentArgs {
  title: string;
  content_type?: string;
  [key: string]: unknown;
}

// Re-export createDrupalContent from the implementation file
export { createDrupalContent } from "./createDrupalContent";
