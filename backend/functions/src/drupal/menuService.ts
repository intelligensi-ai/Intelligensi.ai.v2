import axios from "axios";

const DRUPAL_SITE_URL = process.env.DRUPAL_SITE_URL || "";
const DRUPAL_API_USERNAME = process.env.DRUPAL_API_USERNAME || "";
const DRUPAL_API_PASSWORD = process.env.DRUPAL_API_PASSWORD || "";

export interface MenuItem {
  uuid: string;
  title: string;
  url: string;
  route_name: string;
  route_parameters: Record<string, string>;
  weight: number;
  expanded: boolean;
  enabled: boolean;
  children: MenuItem[];
}

export interface Menu {
  id: string;
  label: string;
  description: string;
  locked: boolean;
  count: number;
}

export interface DrupalResponse {
  status?: string;
  fid?: string;
  media_id?: string;
  url?: string;
  alt?: string;
  uuid?: string;
  media_bundle?: string;
  data?: Record<string, unknown>;
  id?: string;
  type?: string;
  attributes?: Record<string, unknown>;
  error?: { message: string; code: number };
  message?: string;
  code?: number;
  menu_name?: string;
  items?: MenuItem[];
  menus?: Menu[];
  count?: number;
}

export interface MenuOperation {
  action: "list_menus" | "read_menu" | "add_menu_item" | "update_menu_item" | "delete_menu_item";
  parameters: {
    menu_name?: string;
    title?: string;
    url?: string;
    uuid?: string;
    weight?: number;
    parent?: string;
    expanded?: boolean;
    enabled?: boolean;
    Placeholder1?: string;
  };
}

/**
 * Handle a single Drupal menu operation against the Bridge API.
 * @param {string} menuName The menu machine name to operate on
 * @param {MenuOperation} operation Operation descriptor including action and parameters
 * @return {Promise<DrupalResponse>} The Drupal Bridge API response
 */
export async function handleMenuOperation(menuName: string, operation: MenuOperation): Promise<DrupalResponse> {
  const { action, parameters } = operation;
  const baseUrl = `${DRUPAL_SITE_URL}/api/menu`;

  try {
    const auth = {
      username: DRUPAL_API_USERNAME,
      password: DRUPAL_API_PASSWORD,
    };

    switch (action) {
    case "list_menus": {
      const listResponse = await axios.get(`${baseUrl}/list`, { auth });
      return listResponse.data;
    }
    case "add_menu_item": {
      const title = parameters.Placeholder1 || parameters.title || "New Menu Item";
      const addResponse = await axios.post(
        `${baseUrl}/main`,
        {
          operation: "add",
          title: title,
          url: parameters.url || `internal:${title.toLowerCase().replace(/\s+/g, "-")}`,
          weight: parameters.weight || 0,
          parent: parameters.parent || "",
          expanded: parameters.expanded || false,
          enabled: parameters.enabled !== false,
        },
        { auth }
      );
      return addResponse.data;
    }
    case "read_menu": {
      const readResponse = await axios.get(`${baseUrl}/${parameters.menu_name || menuName}`, { auth });
      return readResponse.data;
    }
    case "update_menu_item": {
      if (!parameters.uuid) {
        throw new Error("UUID is required for updating a menu item");
      }
      const updateResponse = await axios.post(
        `${baseUrl}/${menuName}`,
        {
          operation: "update",
          uuid: parameters.uuid,
          ...(parameters.title && { title: parameters.title }),
          ...(parameters.url && { url: parameters.url }),
          ...(parameters.weight !== undefined && { weight: parameters.weight }),
          ...(parameters.parent !== undefined && { parent: parameters.parent }),
          ...(parameters.expanded !== undefined && { expanded: parameters.expanded }),
          ...(parameters.enabled !== undefined && { enabled: parameters.enabled }),
        },
        { auth }
      );
      return updateResponse.data;
    }
    case "delete_menu_item": {
      if (!parameters.uuid) {
        throw new Error("UUID is required for deleting a menu item");
      }
      const deleteResponse = await axios.post(
        `${baseUrl}/${menuName}`,
        {
          operation: "delete",
          uuid: parameters.uuid,
        },
        { auth }
      );
      return deleteResponse.data;
    }
    default:
      throw new Error(`Unsupported menu operation: ${action}`);
    }
  } catch (error) {
    console.error("Menu operation failed:", error);
    throw error;
  }
}
