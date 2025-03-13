import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { EventPattern } from '@nestjs/microservices';
import { FirebirdDatabaseService } from '../database/firebird.service';
import { Stock } from '../models/stock.model';
import { InjectModel } from '@nestjs/sequelize';

interface StockEventPayload {
  articleId?: string;
  articleCode?: string;
  quantity: number;
  warehouse: string; // "MDP", "ROS", "BA", "GP"
  pending?: boolean;
}

@Injectable()
export class StockService {
  private articleCodeMap: Record<string, string> = {};

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly fdbService: FirebirdDatabaseService,
    @InjectModel(Stock) private stockModel: typeof Stock
  ) {
  }

  async loadArticleMappings() {
    const articles = await this.fdbService.query(
      'SELECT CODIGOPARTICULAR, CODIGOARTICULO FROM ARTICULOS'
    );
    articles.forEach(article => {
      this.articleCodeMap[article.CODIGOPARTICULAR] = article.CODIGOARTICULO;
    });
  }

  /**
   * Retrieves the article ID corresponding to the given article code.
   *
   * @param articleCode - The code of the article.
   * @returns {Promise<string | null>} The article ID or null if not found.
   */
  async getArticleId(articleCode: string): Promise<string | null> {
    if (!this.articleCodeMap[articleCode]) {
      await this.loadArticleMappings();
    }
    return this.articleCodeMap[articleCode] || null;
  }

  /**
   * Resolves the database field name based on the warehouse and pending flag.
   *
   * @param warehouse - The warehouse identifier ("MDP", "ROS", "BA", "GP").
   * @param pending - If true, returns the pending stock column name.
   * @returns {string | null} The field name or null if the warehouse is invalid.
   */
  private resolveFieldName(warehouse: string, pending: boolean = false): string | null {
    const mapping = {
      'MDP': pending ? 'pending_mdp' : 'stock_mdp',
      'BA': pending ? 'pending_ba' : 'stock_ba',
      'GP': pending ? 'pending_gp' : 'stock_gp',
      'ROS': pending ? 'pending_ros' : 'stock_ros',
    };
    return mapping[warehouse.toUpperCase()] || null;
  }

  /**
   * Handles the reservation of stock.
   *
   * This method reserves stock for an article by incrementing the current stock field
   * for the specified warehouse. It can accept either an articleId or an articleCode (which
   * will be converted to articleId).
   *
   * @param data - Reservation payload.
   * @returns {Promise<void>}
   *
   */
  async handleReserveStock(data: StockEventPayload): Promise<void> {
    let articleIdentifier: string | null = null;
    if (data.articleCode) {
      articleIdentifier = await this.getArticleId(data.articleCode);
      if (!articleIdentifier) {
        console.log(`Article code ${data.articleCode} not found`);
        return;
      }
    } else if (data.articleId) {
      articleIdentifier = data.articleId;
    } else {
      console.log(`No article identifier provided`);
      return;
    }

    const fieldName = this.resolveFieldName(data.warehouse, data.pending);
    if (!fieldName) {
      console.log(`Invalid warehouse provided: ${data.warehouse}`);
      return;
    }
    const stockRecord = await this.stockModel.findOne({ where: { article_code: articleIdentifier } });
    if (!stockRecord) {
      console.log(`Stock record for article ${articleIdentifier} not found`);
      return;
    }
    const currentValue = (stockRecord as any)[fieldName] || 0;
    const newValue = currentValue + data.quantity;
    await stockRecord.update({ [fieldName]: newValue, date_updated: new Date() });
    console.log(`Stock reserved: ${data.quantity} for article ${articleIdentifier} (${fieldName})`);
  }

  /**
   * Handles the release of stock.
   *
   * This method releases (decrements) stock for an article in the specified warehouse.
   * It accepts either an articleId or an articleCode (which is converted to articleId).
   *
   * @param data - Release payload.
   * @returns {Promise<void>}
   *
   */
  async handleReleaseStock(data: StockEventPayload): Promise<void> {
    let articleIdentifier: string | null = null;
    if (data.articleCode) {
      articleIdentifier = await this.getArticleId(data.articleCode);
      if (!articleIdentifier) {
        console.log(`Article code ${data.articleCode} not found`);
        return;
      }
    } else if (data.articleId) {
      articleIdentifier = data.articleId;
    } else {
      console.log(`No article identifier provided`);
      return;
    }

    const fieldName = this.resolveFieldName(data.warehouse, data.pending);
    if (!fieldName) {
      console.log(`Invalid warehouse provided: ${data.warehouse}`);
      return;
    }
    const stockRecord = await this.stockModel.findOne({ where: { article_code: articleIdentifier } });
    if (!stockRecord) {
      console.log(`Stock record for article ${articleIdentifier} not found`);
      return;
    }
    const currentValue = (stockRecord as any)[fieldName] || 0;
    const newValue = Math.max(0, currentValue - data.quantity);
    await stockRecord.update({ [fieldName]: newValue, date_updated: new Date() });
    console.log(`Stock released: ${data.quantity} for article ${articleIdentifier} (${fieldName})`);
  }

  /**
   * Retrieves the stock record(s) for one or more articles.
   *
   * @param articleIdParam - The unique identifier(s) of the article(s).
   * @param articleCodeParam - The unique code(s) of the article(s).
   * @returns The stock record(s) as plain objects, or a message if not found.
   *
   */
  async getStockByArticle(articleIdParam: string | string[], articleCodeParam: string | string[]) {
    const articleIds = Array.isArray(articleIdParam) ? articleIdParam : [articleIdParam];
    const articleCodes = Array.isArray(articleCodeParam) ? articleCodeParam : [articleCodeParam];
    const errors: { source?: string, title: string; detail: string }[] = [];
    for (const code of articleCodes) {
      const articleId = await this.getArticleId(code);
      if (articleId) {
        articleIds.push(articleId);
      } else {
        console.log(`Article code ${code} not found`);
        errors.push({title: 'Article code not found', detail: `Article code ${code} not found`});
      }
    }

    let stockRecords: Stock[] = [];
    if (articleIds.length > 0) {
      stockRecords = await this.stockModel.findAll({ where: { article_code: articleIds } });
    }

    return {
      data: stockRecords.map(record => record.toJSON()),
      errors: errors.length > 0 ? errors : undefined
    };
  }

  async getAllStock() {
    const cacheKey = 'allStock';
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }
  
    const stocks = await this.stockModel.findAll();
    const plainStocks = stocks.map(stock => stock.toJSON());
    await this.cacheManager.set(cacheKey, plainStocks, Number(process.env.CACHE_TTL_GLOBAL) || 0);

    return plainStocks;
  }
}