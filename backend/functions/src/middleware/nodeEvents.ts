import { Request, Response, NextFunction } from 'express';
import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

type DrupalNode = {
  type?: Array<string | { target_id?: string }>;
  title?: Array<{ value?: string }>;
  body?: Array<{ value?: string }>;
  field_image?: Array<{ url?: string }>;
  nid?: Array<{ value?: string }>;
  [key: string]: any;
};

type CreatedNode = {
  content_type: string;
  title: string;
  body: string;
  image?: string;
  link: string;
};

// Extend Express Response type to include locals
type NodeResponse = Response & {
  locals: {
    createdNodes?: CreatedNode[];
    [key: string]: any;
  };
};

/**
 * Middleware to handle node creation events
 * This should be used after the node creation endpoint
 */
export const nodeCreationMiddleware = (req: Request, res: NodeResponse, next: NextFunction) => {
  const originalSend = res.send.bind(res);
  
  // Override the send function to capture the response
  res.send = function(body: any) {
    // Call the original send function
    const result = originalSend(body);
    
    // Check if this is a successful node creation response
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        const responseData = typeof body === 'string' ? JSON.parse(body) : body;
        
        // Check if this is a node creation response
        if (responseData?.data?.length) {
          const createdNodes = responseData.data as DrupalNode[];
          
          // Store created nodes in response locals for use in other middleware
          res.locals.createdNodes = createdNodes.map((node: DrupalNode): CreatedNode => {
            // Handle different Drupal response formats
            let nodeType = 'content';
            if (Array.isArray(node.type) && node.type.length > 0) {
              const firstType = node.type[0];
              nodeType = typeof firstType === 'string' 
                ? firstType 
                : (firstType?.target_id || 'content');
            }
            
            const nodeTitle = Array.isArray(node.title) && node.title[0]?.value 
              ? node.title[0].value 
              : 'Untitled';
              
            const nodeId = Array.isArray(node.nid) && node.nid[0]?.value 
              ? node.nid[0].value 
              : '';
            
            // Get host from headers or use default
            const host = req.get('host') || 'localhost';
            const protocol = req.protocol || 'http';
            
            return {
              content_type: nodeType,
              title: nodeTitle,
              body: node.body?.[0]?.value || '',
              image: node.field_image?.[0]?.url,
              link: `${protocol}://${host}/node/${nodeId}`
            };
          });
          // Emit WebSocket event if available
          if (req.app.get('io')) {
            try {
              const io = req.app.get('io') as any; // Use any to avoid type issues with socket.io types
              
              // Emit event for each created node
              res.locals.createdNodes?.forEach((node: CreatedNode) => {
                io.emit('node_created', node);
                
                // Also emit to specific room if we have a site ID
                if (req.params.siteId) {
                  io.to(`site_${req.params.siteId}`).emit('node_created', node);
                }
              });
            } catch (error) {
              console.error('Error emitting node creation event:', error);
            }
          }
        }
      } catch (error) {
        console.error('Error processing node creation event:', error);
      }
    }
    
    return result;
  };
  
  next();
};

/**
 * WebSocket event emitter for node events
 */
type NodeEventServer = SocketIOServer & {
  to(room: string): {
    emit: (event: string, data: any) => void;
  };
};

/**
 * Set up Socket.IO event handlers for node events
 */
export const setupNodeEventEmitter = (httpServer: HttpServer): NodeEventServer => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL?.split(',') || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  }) as NodeEventServer;

  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id);
    
    // Join room for specific site
    socket.on('join_site', (siteId: string) => {
      socket.join(`site_${siteId}`);
      console.log(`Socket ${socket.id} joined site_${siteId}`);
    });
    
    // Leave site room
    socket.on('leave_site', (siteId: string) => {
      socket.leave(`site_${siteId}`);
      console.log(`Socket ${socket.id} left site_${siteId}`);
    });
    
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
  
  return io;
