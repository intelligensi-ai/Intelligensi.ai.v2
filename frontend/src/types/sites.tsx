export interface ICMS {
    id?: number;
    name: string;
    version?: string | null;
    is_active?: boolean;
    has_migrations?: boolean;
    created_at?: Date | string;
    updated_at?: Date | string;
}

export interface ISite {
    id?: number;
    user_id: number;
    cms: ICMS;
    company_id?: number | null;
    site_name: string;
    site_url: string; // 
    description?: string;
    mysql_file_url?: string | null;
    status?: string | null;
    migration_ids?: number[] | null;
    tags?: string | null;
    is_active?: boolean;
    created_at?: Date | string;
    updated_at?: Date | string;
}

// Utility types
export interface ISiteStrict extends Required<ISite> {}
export type ISiteUpdate = Partial<ISite> & { id: number };