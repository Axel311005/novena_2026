import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    try {
      await this.dataSource.query(`
        DROP TRIGGER IF EXISTS trigger_create_asistencia_on_kid_insert ON kid;
        DROP FUNCTION IF EXISTS create_asistencia_on_kid_insert();
      `);
      this.logger.log('Triggers heredados eliminados correctamente.');
    } catch (err) {
      this.logger.warn('No se pudo verificar o eliminar triggers heredados:', err);
    }
  }

  getHello(): string {
    return 'Hello World!';
  }
}
