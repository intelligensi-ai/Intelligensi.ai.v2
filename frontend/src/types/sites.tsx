export interface ICMS {
    id?: number;
    name: string;
    version?: string | null;
    is_active?: boolean;
    has_migrations?: boolean;
    created_at?: Date | string;
    updated_at?: Date | string;
    user_id?: string;
}

export interface ISite {
    id?: number;
    user_id: string;
    cms: ICMS;
    company_id?: number | null;
    site_name: string;
    site_url: string;
    description?: string;
    mysql_file_url?: string | null;
    status?: string | null;
    migration_ids?: number[] | null;
    tags?: string | null;
    is_active?: boolean;
    is_selected?: boolean; // New property to track selection state
    schema_id?: number | null; // <<< ADDED schema_id
    // Drupal specific fields
    drupal_username?: string | null;
    drupal_password?: string | null;
    // Timestamps
    created_at?: Date | string;
    updated_at?: Date | string;
    // For backward compatibility with raw database fields
    cms_version?: string | null;
}

// Utility types
export type ISiteStrict = Required<ISite>
export type ISiteUpdate = Partial<ISite> & { id: number };