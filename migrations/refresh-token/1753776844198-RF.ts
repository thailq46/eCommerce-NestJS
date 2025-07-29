import { MigrationInterface, QueryRunner } from 'typeorm';

export class RF1753776844198 implements MigrationInterface {
   name = 'RF1753776844198';

   public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(
         `CREATE TABLE \`refresh_token\` (\`id\` int NOT NULL AUTO_INCREMENT, \`user_id\` int NOT NULL, \`token\` varchar(500) NULL, \`iat\` int NOT NULL, \`exp\` int NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, UNIQUE INDEX \`IDX_c31d0a2f38e6e99110df62ab0a\` (\`token\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
      );
   }

   public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`DROP INDEX \`IDX_c31d0a2f38e6e99110df62ab0a\` ON \`refresh_token\``);
      await queryRunner.query(`DROP TABLE \`refresh_token\``);
   }
}
