import { MigrationInterface, QueryRunner } from 'typeorm';

export class RF1753777493371 implements MigrationInterface {
   name = 'RF1753777493371';

   public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(
         `CREATE TABLE \`refresh_tokens\` (\`id\` int NOT NULL AUTO_INCREMENT, \`user_id\` int NOT NULL, \`token\` varchar(500) NOT NULL, \`iat\` int NOT NULL COMMENT 'Thời gian tạo token' DEFAULT '0', \`exp\` int NOT NULL COMMENT 'Thời gian hết hạn token' DEFAULT '0', \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, UNIQUE INDEX \`IDX_4542dd2f38a61354a040ba9fd5\` (\`token\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
      );
   }

   public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`DROP INDEX \`IDX_4542dd2f38a61354a040ba9fd5\` ON \`refresh_tokens\``);
      await queryRunner.query(`DROP TABLE \`refresh_tokens\``);
   }
}
