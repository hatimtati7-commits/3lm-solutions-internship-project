import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('document_links')
export class DocumentLinkEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: string;

  // Nom lisible du document (ex: "Ordonnance du 12/08/2026")
  @Column()
  documentName!: string;

  // Emplacement réel du document (peut être géré par un autre module : dossiers patients, etc.)
  @Column()
  fileUrl!: string;

  // Jeton unique, aléatoire, utilisé dans le lien envoyé au patient
  @Column({ unique: true })
  accessToken!: string;

  @Column()
  expiresAt!: Date;

  @Column({ default: 0 })
  accessCount!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
