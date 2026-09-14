import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  RelationId,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('configuracion')
export class Configuracion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', default: 1, name: 'dia_activo' })
  diaActivo: number;

  @Column({ type: 'boolean', default: true, name: 'esta_activa' })
  estaActiva: boolean;

  @Column({
    type: 'varchar',
    length: 100,
    default: 'Novena del Niño Dios',
    name: 'nombre_novena',
  })
  nombreNovena: string;

  @Column({ type: 'int', default: 2026, name: 'anio' })
  anio: number;

  @Column({
    type: 'boolean',
    default: true,
    name: 'auto_marcar_asistencia_creacion',
  })
  autoMarcarAsistenciaCreacion: boolean;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by_user_id' })
  updatedBy: User | null;

  @RelationId((config: Configuracion) => config.updatedBy)
  updatedByUserId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
