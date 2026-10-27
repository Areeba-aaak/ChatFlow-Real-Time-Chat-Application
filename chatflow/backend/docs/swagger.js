const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ChatFlow API Documentation',
      version: '1.0.0',
      description: 'Real-time chat application API',
      contact: {
        name: 'ChatFlow Team',
        email: 'support@chatflow.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            username: { type: 'string' },
            email: { type: 'string' },
            full_name: { type: 'string' },
            avatar: { type: 'string' },
            status: { type: 'string', enum: ['online', 'offline', 'away'] },
            last_seen: { type: 'string', format: 'date-time' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Conversation: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            is_group: { type: 'boolean' },
            created_by: { type: 'integer' },
            last_message_id: { type: 'integer' },
            last_message_at: { type: 'string', format: 'date-time' },
            members: {
              type: 'array',
              items: { $ref: '#/components/schemas/User' },
            },
          },
        },
        Message: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            conversation_id: { type: 'integer' },
            sender_id: { type: 'integer' },
            content: { type: 'string' },
            type: { type: 'string', enum: ['text', 'image', 'file', 'voice', 'video'] },
            file_url: { type: 'string' },
            file_name: { type: 'string' },
            file_size: { type: 'integer' },
            file_type: { type: 'string' },
            reply_to_id: { type: 'integer' },
            created_at: { type: 'string', format: 'date-time' },
            read_by: {
              type: 'array',
              items: { type: 'integer' },
            },
            reactions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  user_id: { type: 'integer' },
                  emoji: { type: 'string' },
                },
              },
            },
          },
        },
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            recipient_id: { type: 'integer' },
            sender_id: { type: 'integer' },
            type: { type: 'string', enum: ['message', 'mention', 'group_invite', 'group_update', 'reaction'] },
            content: { type: 'string' },
            conversation_id: { type: 'integer' },
            message_id: { type: 'integer' },
            read_at: { type: 'string', format: 'date-time' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Users', description: 'User management endpoints' },
      { name: 'Conversations', description: 'Conversation management endpoints' },
      { name: 'Messages', description: 'Message management endpoints' },
      { name: 'Notifications', description: 'Notification management endpoints' },
      { name: 'Upload', description: 'File upload endpoints' },
    ],
  },
  apis: ['./routes/*.js', './controllers/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;