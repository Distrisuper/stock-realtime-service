import { Test } from '@nestjs/testing';
import { StockService } from './stock.service';
import { FirebirdDatabaseService } from '../database/firebird.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Stock } from '../models/stock.model';

describe('StockService', () => {
  let service: StockService;
  let cacheManager: any;
  let fdbService: any;

  beforeEach(async () => {
    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    };
    fdbService = {
      query: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        StockService,
        { provide: CACHE_MANAGER, useValue: cacheManager },
        { provide: FirebirdDatabaseService, useValue: fdbService },
      ],
    }).compile();

    service = moduleRef.get<StockService>(StockService);
  });

  describe('getAllStock', () => {
    it('should return cached stocks if available', async () => {
      const cachedStocks = [{ article_code: '04768', stock_mdp: 4 }];
      cacheManager.get.mockResolvedValue(cachedStocks);

      const result = await service.getAllStock();
      expect(result).toEqual(cachedStocks);
      expect(cacheManager.get).toHaveBeenCalledWith('allStock');
    });

    it('should fetch stocks from DB and cache them if not cached', async () => {
      cacheManager.get.mockResolvedValue(null);
      const mockStocks = [
        { toJSON: () => ({ article_code: '04768', stock_mdp: 4 }) },
      ];
      jest.spyOn(Stock, 'findAll').mockResolvedValue(mockStocks as any);

      const result = await service.getAllStock();
      expect(Stock.findAll).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalledWith('allStock', [{ article_code: '04768', stock_mdp: 4 }], 60);
      expect(result).toEqual([{ article_code: '04768', stock_mdp: 4 }]);
    });
  });

  describe('getStockByArticle', () => {
    it('should convert articleCodes to articleIds and query DB once with all identifiers', async () => {
      jest.spyOn(service, 'getArticleId').mockImplementation(async (code: string) => {
        return code === 'FRI44420' ? '04768' : null;
      });

      const initialArticleIds = ['28155']; // FRI94226
      const articleCodes = ['FRI44420']; // 04768

      const mockStockRecords = [
        { toJSON: () => ({
            "article_code": "28155",
            "stock_mdp": 0,
            "stock_ba": 36,
            "stock_gp": 2,
            "pending_mdp": 4,
            "pending_ba": 16,
            "pending_gp": 0,
            "date_created": "2025-02-27T06:59:25.000Z",
            "date_updated": "2025-02-27T06:59:00.000Z",
            "date_updated_ba": "2025-02-27T06:59:00.000Z",
            "stock_ros": 2,
            "pending_ros": 0
        }) },
        { toJSON: () => (	{
            "article_code": "04768",
            "stock_mdp": 4,
            "stock_ba": 1,
            "stock_gp": 2,
            "pending_mdp": 0,
            "pending_ba": 0,
            "pending_gp": 0,
            "date_created": "2025-02-27T06:59:25.000Z",
            "date_updated": "2025-02-28T14:58:46.000Z",
            "date_updated_ba": "2025-02-27T06:59:00.000Z",
            "stock_ros": 0,
            "pending_ros": 0
        }) },
      ];
      const findAllSpy = jest.spyOn(Stock, 'findAll').mockResolvedValue(mockStockRecords as any);

      const result = await service.getStockByArticle(initialArticleIds, articleCodes);

      const expectedIds = ['28155', '04768'];
      expect(findAllSpy).toHaveBeenCalledWith({ where: { article_code: expectedIds } });
      expect(result).toEqual([
        {
          article_code: '28155',
          stock_mdp: 0,
          stock_ba: 36,
          stock_gp: 2,
          pending_mdp: 4,
          pending_ba: 16,
          pending_gp: 0,
          date_created: '2025-02-27T06:59:25.000Z',
          date_updated: '2025-02-27T06:59:00.000Z',
          date_updated_ba: '2025-02-27T06:59:00.000Z',
          stock_ros: 2,
          pending_ros: 0,
        },
        {
          article_code: '04768',
          stock_mdp: 4,
          stock_ba: 1,
          stock_gp: 2,
          pending_mdp: 0,
          pending_ba: 0,
          pending_gp: 0,
          date_created: '2025-02-27T06:59:25.000Z',
          date_updated: '2025-02-28T14:58:46.000Z',
          date_updated_ba: '2025-02-27T06:59:00.000Z',
          stock_ros: 0,
          pending_ros: 0,
        },
      ]);
    });
  });
});