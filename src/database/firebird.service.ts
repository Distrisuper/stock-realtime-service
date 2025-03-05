import { Injectable } from '@nestjs/common';
import * as Firebird from 'node-firebird';

@Injectable()
export class FirebirdDatabaseService {
  private options = {
    host: process.env.FIREBIRD_DISTRI_PPAL_HOST,
    port: process.env.FIREBIRD_DISTRI_PPAL_PORT ? parseInt(process.env.FIREBIRD_DISTRI_PPAL_PORT, 10) : 3050,
    database: process.env.FIREBIRD_DISTRI_PPAL_DATABASE,
    user: process.env.FIREBIRD_DISTRI_PPAL_USER,
    password: process.env.FIREBIRD_DISTRI_PPAL_PASSWORD,
  };

  query(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      Firebird.attach(this.options, (err, db) => {
        if (err) reject(err);
        db.query(sql, params, (err, result) => {
          db.detach();
          if (err) reject(err);
          resolve(result);
        });
      });
    });
  }
}
