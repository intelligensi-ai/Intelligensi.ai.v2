export interface UserData {
    display_name: string;
    id: string;
    uid: string;
    email: string;
    company_id: string;
    is_active: boolean;
  }
  
  export interface ApiResponse {
    success: boolean;
    data?: UserData[];
    error?: string;
  }