import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { FirebirdDatabaseService } from './database/firebird.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { Stock } from './models/stock.model';
import { StockHttpController } from './controllers/stock.controller';
import { StockService } from './services/stock.service';

@Module({
  imports: [
    CacheModule.register({
      ttl: 60,
      max: 100
    }),
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    SequelizeModule.forRoot({
      dialect: 'mysql',
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT) || 3306,
      username: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      models: [Stock],
      autoLoadModels: true,
      synchronize: true,
    }),
    SequelizeModule.forFeature([Stock]),
  ],
  controllers: [StockHttpController],
  providers: [StockService, FirebirdDatabaseService],
})
export class AppModule {}
