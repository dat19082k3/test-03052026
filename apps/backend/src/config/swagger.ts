import swaggerJSDoc from 'swagger-jsdoc';

const port = process.env.PORT || 4000;

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Backend API Documentation',
      version: '1.0.0',
      description: 'API documentation for the express backend service',
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/app.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);
