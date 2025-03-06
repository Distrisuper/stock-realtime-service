import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { StockService } from '../services/stock.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiQuery } from '@nestjs/swagger';

interface StockEventPayload {
  articleId?: string;
  articleCode?: string;
  quantity: number;
  warehouse: string; // "MDP", "ROS", "BA", "GP"
  pending?: boolean;
}

@ApiTags('Stock')
@Controller('stock')
export class StockHttpController {
  constructor(private readonly stockService: StockService) {}

  @Post('reserve')
  @ApiOperation({ summary: 'Reservar stock para un artículo (sumar/agregar)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        articleId: { type: 'string', description: 'El identificador único del artículo (también conocido como CODIGOARTICULO)' },
        articleCode: { type: 'string', description: 'El código visible del artículo (también conocido como CODIGOPARTICULAR)' },
        quantity: { type: 'number', description: 'La cantidad de stock a reservar (positivo)' },
        warehouse: { type: 'string', enum: ['MDP', 'ROS', 'BA', 'GP'], description: 'La sucursal donde se reserva el stock' },
        pending: { type: 'boolean', description: 'Si el stock está pendiente' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Stock reservado',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Stock reservado' },
          },
        },
      },
    },
  })
  async reserveStock(@Body() data: StockEventPayload) {
    await this.stockService.handleReserveStock(data);
    return { data: { message: 'Stock reservado' } };
  }

  @Post('release')
  @ApiOperation({ summary: 'Liberar stock para un artículo (restar/descontar)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        articleId: { type: 'string', description: 'El identificador único del artículo (también conocido como CODIGOARTICULO)' },
        articleCode: { type: 'string', description: 'El código visible del artículo  (también conocido como CODIGOPARTICULAR)' },
        quantity: { type: 'number', description: 'La cantidad de stock a liberar (positivo)' },
        warehouse: { type: 'string', enum: ['MDP', 'ROS', 'BA', 'GP'], description: 'La sucursal donde se libera el stock' },
        pending: { type: 'boolean', description: 'Si el stock está pendiente' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Stock liberado',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Stock liberado' },
          },
        },
      },
    },
  })
  async releaseStock(@Body() data: StockEventPayload) {
    await this.stockService.handleReleaseStock(data);
    return { data: { message: 'Stock liberado' } };
  }

  @Get()
  @ApiOperation({ summary: 'Devolver stock para uno o más artículos' })
  @ApiQuery({ name: 'articleId', required: false, type: String, description: 'El/los identificador único/s (articleId) del/los artículo/s, separado por comas (CODIGOARTICULO)' })
  @ApiQuery({ name: 'articleCode', required: false, type: String, description: 'El/los código/s único/s (articleCode) del/los artículo/s, separado por comas (CODIGOPARTICULAR)' })
  @ApiResponse({
    status: 200,
    description: 'Datos de stock para el/los artículo/s especificado/s.',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              article_code: { type: 'string' },
              stock_mdp: { type: 'number' },
              stock_ba: { type: 'number' },
              stock_gp: { type: 'number' },
              pending_mdp: { type: 'number' },
              pending_ba: { type: 'number' },
              pending_gp: { type: 'number' },
              date_created: { type: 'string', format: 'date-time' },
              date_updated: { type: 'string', format: 'date-time' },
              date_updated_ba: { type: 'string', format: 'date-time' },
              stock_ros: { type: 'number' },
              pending_ros: { type: 'number' },
            },
          },
        },
      },
    },
  })
  async getStockByArticle(@Query('articleId') articleId: string, @Query('articleCode') articleCode: string) {
    const articleIds = articleId ? articleId.split(',').map(id => id.trim()) : [];
    const articleCodes = articleCode ? articleCode.split(',').map(code => code.trim()) : [];
    const stock = await this.stockService.getStockByArticle(articleIds, articleCodes);
    return { data: stock };
  }

  @Get('all')
  @ApiOperation({ summary: 'Devolver todos los datos del stock' })
  @ApiResponse({
    status: 200,
    description: 'Un listado de todos los registros de stock.',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              article_code: { type: 'string' },
              stock_mdp: { type: 'number' },
              stock_ba: { type: 'number' },
              stock_gp: { type: 'number' },
              pending_mdp: { type: 'number' },
              pending_ba: { type: 'number' },
              pending_gp: { type: 'number' },
              date_created: { type: 'string', format: 'date-time' },
              date_updated: { type: 'string', format: 'date-time' },
              date_updated_ba: { type: 'string', format: 'date-time' },
              stock_ros: { type: 'number' },
              pending_ros: { type: 'number' },
            },
          },
        },
      },
    },
  })
  async getAllStock() {
    const stocks = await this.stockService.getAllStock();
    return { data: stocks };
  }
}