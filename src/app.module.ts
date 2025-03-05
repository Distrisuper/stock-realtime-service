import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { FirebirdDatabaseService } from './database/firebird.service';
import { mysqlConfig } from './database.config';
import { SequelizeModule } from '@nestjs/sequelize';
import { Stock } from './models/stock.model';
import { StockHttpController } from './controllers/stock.controller';
import { StockService } from './services/stock.service';

@Module({
  imports: [
    CacheModule.register({
      ttl: Number(process.env.CACHE_TTL_GLOBAL) || 0,
      max: 100
    }),
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    SequelizeModule.forRoot(mysqlConfig),
    SequelizeModule.forFeature([Stock]),
  ],
  controllers: [StockHttpController],
  providers: [StockService, FirebirdDatabaseService],
})
export class AppModule {}
