import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
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
   * @returns {Promise<{ data?: any; errors?: { source?: string; title: string; detail: string }[] }>}
   *
   */
  async handleReserveStock(data: StockEventPayload): Promise<{ data?: any; errors?: { source?: string; title: string; detail: string }[] }> {
    let articleIdentifier: string | null = null;
    const errors: { source?: string, title: string; detail: string }[] = [];
    if (data.articleCode) {
      articleIdentifier = await this.getArticleId(data.articleCode);
      if (!articleIdentifier) {
        errors.push({title: 'Article code not found', detail: `Article code ${data.articleCode} not found`});
        return { errors };
      }
    } else if (data.articleId) {
      articleIdentifier = data.articleId;
    } else {
      return { errors: [{ title: 'Missing article identifier', detail: 'Either articleId or articleCode must be provided' }] };
    }

    const fieldName = this.resolveFieldName(data.warehouse, data.pending);
    if (!fieldName) {
      return { errors: [{ title: 'Invalid warehouse', detail: `Warehouse ${data.warehouse} is not valid` }] };
    }
    const stockRecord = await this.stockModel.findOne({ where: { article_code: articleIdentifier } });
    if (!stockRecord) {
      return { errors: [{ title: 'Stock record not found', detail: `Stock record for article ${articleIdentifier} not found` }] };
    }
    const currentValue = (stockRecord as any)[fieldName] || 0;
    const newValue = currentValue + data.quantity;
    await stockRecord.update({ [fieldName]: newValue, date_updated: new Date() });

    return {
      data: {
        id: articleIdentifier,
        type: 'stock',
        attributes: {
          article_code: articleIdentifier,
          [fieldName]: newValue,
          reserved_quantity: data.quantity,
          warehouse: data.warehouse,
          pending: data.pending || false,
          updated_at: new Date()
        }
      }
    };
  }

  /**
   * Handles the release of stock.
   *
   * This method releases (decrements) stock for an article in the specified warehouse.
   * It accepts either an articleId or an articleCode (which is converted to articleId).
   *
   * @param data - Release payload.
   * @returns {Promise<{ data?: any; errors?: { source?: string; title: string; detail: string }[] }>}
   *
   */
  async handleReleaseStock(data: StockEventPayload): Promise<{ data?: any; errors?: { source?: string; title: string; detail: string }[] }> {
    let articleIdentifier: string | null = null;
    const errors: { source?: string, title: string; detail: string }[] = [];

    if (data.articleCode) {
      articleIdentifier = await this.getArticleId(data.articleCode);
      if (!articleIdentifier) {
        errors.push({title: 'Article code not found', detail: `Article code ${data.articleCode} not found`});
        return { errors };
      }
    } else if (data.articleId) {
      articleIdentifier = data.articleId;
    } else {
      return { errors: [{ title: 'Missing article identifier', detail: 'Either articleId or articleCode must be provided' }] };
    }

    const fieldName = this.resolveFieldName(data.warehouse, data.pending);
    if (!fieldName) {
      return { errors: [{ title: 'Invalid warehouse', detail: `Warehouse ${data.warehouse} is not valid` }] };
    }
    const stockRecord = await this.stockModel.findOne({ where: { article_code: articleIdentifier } });
    if (!stockRecord) {
      return { errors: [{ title: 'Stock record not found', detail: `Stock record for article ${articleIdentifier} not found` }] };
    }
    const currentValue = (stockRecord as any)[fieldName] || 0;
    const newValue = Math.max(0, currentValue - data.quantity);
    await stockRecord.update({ [fieldName]: newValue, date_updated: new Date() });
    return {
      data: {
        id: articleIdentifier,
        type: 'stock',
        attributes: {
          article_code: articleIdentifier,
          [fieldName]: newValue,
          released_quantity: data.quantity,
          warehouse: data.warehouse,
          pending: data.pending || false,
          updated_at: new Date()
        }
      }
    };
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