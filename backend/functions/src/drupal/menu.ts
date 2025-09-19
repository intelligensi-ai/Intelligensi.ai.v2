import { AxiosInstance } from "axios";

export type MenuOperationType =
  | "create-menu"
  | "update-menu"
  | "delete-menu"
  | "add-item"
  | "update-item"
  | "remove-item"
  | "get";

export interface MenuItemInput {
  title: string;
  url?: string;
  weight?: number;
  parent?: string | null;
}

export interface MenuOperation {
  operation: MenuOperationType;
  menuName?: string;
  itemId?: string | number;
  item?: MenuItemInput;
  // raw payload passthrough if needed
  payload?: Record<string, unknown>;
}

export interface MenuOperationResult {
  success: boolean;
  message?: string;
  data?: unknown;
}

/**
 * Handle a Drupal menu operation by calling the Drupal bridge.
 * This is a thin wrapper; adapt the endpoint paths to your Drupal bridge.
 */
export async function handleMenuOperation(
  client: AxiosInstance,
  op: MenuOperation
): Promise<MenuOperationResult> {
  try {
    switch (op.operation) {
      case "get": {
        const res = await client.get("/api/menu", {
          params: { name: op.menuName },
          validateStatus: () => true,
        });
        return {
          success: res.status >= 200 && res.status < 300,
          message: res.statusText,
          data: res.data,
        };
      }
      case "create-menu": {
        const res = await client.post("/api/menu", {
          name: op.menuName,
          ...(op.payload || {}),
        });
        return { success: true, data: res.data };
      }
      case "update-menu": {
        const res = await client.patch("/api/menu", {
          name: op.menuName,
          ...(op.payload || {}),
        });
        return { success: true, data: res.data };
      }
      case "delete-menu": {
        const res = await client.delete("/api/menu", {
          data: { name: op.menuName },
        });
        return { success: true, data: res.data };
      }
      case "add-item": {
        const res = await client.post("/api/menu/item", {
          menu: op.menuName,
          item: op.item,
          ...(op.payload || {}),
        });
        return { success: true, data: res.data };
      }
      case "update-item": {
        const res = await client.patch("/api/menu/item", {
          menu: op.menuName,
          id: op.itemId,
          item: op.item,
          ...(op.payload || {}),
        });
        return { success: true, data: res.data };
      }
      case "remove-item": {
        const res = await client.delete("/api/menu/item", {
          data: { menu: op.menuName, id: op.itemId },
        });
        return { success: true, data: res.data };
      }
      default:
        return { success: false, message: `Unsupported operation: ${op.operation}` };
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, message: msg };
  }
}
