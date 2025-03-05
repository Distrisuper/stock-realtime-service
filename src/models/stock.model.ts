import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    Default,
} from 'sequelize-typescript';

@Table({
  tableName: 'stock_test',
  timestamps: false,
})
export class Stock extends Model<Stock> {
  @PrimaryKey
  @Column({
    type: DataType.STRING(15),
    allowNull: false,
  })
  article_code: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  stock_mdp: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  stock_ba: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  stock_gp: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  pending_mdp: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  pending_ba: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  pending_gp: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: DataType.NOW,
  })
  date_created: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  date_updated: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  date_updated_ba?: Date;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  stock_ros: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  pending_ros: number;
}