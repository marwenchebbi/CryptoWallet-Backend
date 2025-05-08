
  export default () => ({
    jwt: {
      secret: process.env.JWT_SECRET,
    },
    database: {
      connectionString: process.env.MONGO_URL,
    },
    privateKey: {
      secret: process.env.SECRET_KEY_ENCRYPTION,
    },
    email: {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587', 10),
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
      from: process.env.EMAIL_FROM || 'no-reply@yourapp.com',
    },
    frontend: {
      url: process.env.FRONTEND_URL || 'http://localhost:3000',
    },
  });





// 
  export interface Configuration {
    jwt: {
      secret: string;
    };
    database: {
      connectionString: string;
    };
    privateKey: {
      secret: string;
    };
    email: {
      host: string;
      port: number;
      user: string;
      pass: string;
      from: string;
    };
    frontend: {
      url: string;
    };
  }
  