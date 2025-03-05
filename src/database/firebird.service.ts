import { Injectable } from '@nestjs/common';
import * as Firebird from 'node-firebird';
import { firebirdConfig } from '../database.config';

@Injectable()
export class FirebirdDatabaseService {
  private options = firebirdConfig;

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
