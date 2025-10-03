import axios from "../utils/axios";

export type MenuOperation = {
  action:
    | "list_menus"
    | "read_menu"
    | "add_menu_item"
    | "update_menu_item"
    | "delete_menu_item";
  parameters: Record<string, unknown>;
};

const DRUPAL_SITE_URL = process.env.DRUPAL_SITE_URL || "";

/**
 * Execute a menu operation against the Drupal bridge.
 * @param {string} menuName Default menu name to operate on
 * @param {MenuOperation} operation Operation descriptor
 * @param {string} [siteUrl] Optional base URL for the target Drupal site.
 * If omitted, falls back to DRUPAL_SITE_URL env.
 * @return {Promise<unknown>} Raw response data from the bridge
 */
export async function handleMenuOperation(
  menuName: string,
  operation: MenuOperation,
  siteUrl?: string
): Promise<unknown> {
  const { action, parameters } = operation;
  const base = (typeof siteUrl === "string" && siteUrl) ? siteUrl : DRUPAL_SITE_URL;
  if (!base) throw new Error("No Drupal site URL provided. Pass siteUrl or set DRUPAL_SITE_URL env.");
  const baseUrl = `${base.replace(/\/$/, "")}/api/menu`;
  switch (action) {
  case "list_menus": {
    const r = await axios.get(`${baseUrl}/list`);
    return r.data;
  }
  case "read_menu": {
    const r = await axios.get(`${baseUrl}/${parameters.menu_name || menuName}`);
    return r.data;
  }
  case "add_menu_item": {
    const title = (parameters.Placeholder1 as unknown) ||
      (parameters.title as unknown) ||
      "New Menu Item";
    const titleStr = String(title);
    const payload = {
      operation: "add",
      title: titleStr,
      url: (parameters.url as unknown) ||
        `internal:${titleStr.toLowerCase().replace(/\s+/g, "-")}`,
      weight: parameters.weight || 0,
      parent: parameters.parent || "",
      expanded: parameters.expanded || false,
      enabled: parameters.enabled !== false,
    };
    const r = await axios.post(`${baseUrl}/main`, payload);
    return r.data;
  }
  case "update_menu_item": {
    if (!parameters.uuid) throw new Error("UUID required for update");
    const payload: Record<string, unknown> = {
      operation: "update",
      uuid: parameters.uuid as string,
    };
    if (parameters.title) (payload as Record<string, unknown>).title = parameters.title;
    if (parameters.url) (payload as Record<string, unknown>).url = parameters.url;
    if (parameters.weight !== undefined) (payload as Record<string, unknown>).weight = parameters.weight;
    if (parameters.parent !== undefined) (payload as Record<string, unknown>).parent = parameters.parent;
    if (parameters.expanded !== undefined) (payload as Record<string, unknown>).expanded = parameters.expanded;
    if (parameters.enabled !== undefined) (payload as Record<string, unknown>).enabled = parameters.enabled;
    const r = await axios.post(`${baseUrl}/${menuName}`, payload);
    return r.data;
  }
  case "delete_menu_item": {
    if (!parameters.uuid) throw new Error("UUID required for delete");
    const r = await axios.post(`${baseUrl}/${menuName}`, { operation: "delete", uuid: parameters.uuid });
    return r.data;
  }
  default:
    throw new Error(`Unsupported menu action: ${action}`);
  }
}
