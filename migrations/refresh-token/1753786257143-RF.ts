import { MigrationInterface, QueryRunner } from 'typeorm';

export class RF1753786257143 implements MigrationInterface {
   name = 'RF1753786257143';

   public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`ALTER TABLE \`refresh_tokens\` DROP COLUMN \`created_at\``);
      await queryRunner.query(
         `ALTER TABLE \`refresh_tokens\` ADD \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP`,
      );
      await queryRunner.query(`ALTER TABLE \`refresh_tokens\` DROP COLUMN \`updated_at\``);
      await queryRunner.query(
         `ALTER TABLE \`refresh_tokens\` ADD \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`,
      );
   }

   public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`ALTER TABLE \`refresh_tokens\` DROP COLUMN \`updated_at\``);
      await queryRunner.query(
         `ALTER TABLE \`refresh_tokens\` ADD \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`,
      );
      await queryRunner.query(`ALTER TABLE \`refresh_tokens\` DROP COLUMN \`created_at\``);
      await queryRunner.query(
         `ALTER TABLE \`refresh_tokens\` ADD \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP`,
      );
   }
}
