export interface ICMS {
    id?: number;
    name: string;              // e.g. "Drupal 7", "WordPress"
    version?: string | null;   // e.g. "9.4.0", "6.2"
    is_active?: boolean;
    has_migrations?: boolean;  // If CMS supports migration workflows
    created_at?: Date | string;
    updated_at?: Date | string;
}

// Utility types (consistent with ISite pattern)
export type ICMSStrict = Required<ICMS>
export type ICMSUpdate = Partial<ICMS> & { id: number };