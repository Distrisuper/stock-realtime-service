import { SequelizeModuleOptions } from '@nestjs/sequelize';
import { Stock } from './models/stock.model';
import * as dotenv from 'dotenv';
dotenv.config();

export const mysqlConfig: SequelizeModuleOptions = {
  dialect: 'mysql',
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT) || 3306,
  username: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  models: [Stock],
  autoLoadModels: true,
  synchronize: true,
};

interface CustomFirebirdOptions {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
}

export const firebirdConfig: CustomFirebirdOptions = {
  host: process.env.FIREBIRD_DISTRI_PPAL_HOST || '',
  port: process.env.FIREBIRD_DISTRI_PPAL_PORT ? parseInt(process.env.FIREBIRD_DISTRI_PPAL_PORT, 10) : 3050,
  database: process.env.FIREBIRD_DISTRI_PPAL_DATABASE || '',
  user: process.env.FIREBIRD_DISTRI_PPAL_USER || '',
  password: process.env.FIREBIRD_DISTRI_PPAL_PASSWORD || '',
};