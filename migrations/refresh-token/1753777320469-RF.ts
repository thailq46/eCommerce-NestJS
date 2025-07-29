import { MigrationInterface, QueryRunner } from 'typeorm';

export class RF1753777320469 implements MigrationInterface {
   name = 'RF1753777320469';

   public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`ALTER TABLE \`refresh_token\` CHANGE \`token\` \`token\` varchar(500) NOT NULL`);
      await queryRunner.query(
         `ALTER TABLE \`refresh_token\` CHANGE \`iat\` \`iat\` int NOT NULL COMMENT 'Thời gian tạo token' DEFAULT '0'`,
      );
      await queryRunner.query(
         `ALTER TABLE \`refresh_token\` CHANGE \`exp\` \`exp\` int NOT NULL COMMENT 'Thời gian hết hạn token' DEFAULT '0'`,
      );
   }

   public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`ALTER TABLE \`refresh_token\` CHANGE \`exp\` \`exp\` int NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`refresh_token\` CHANGE \`iat\` \`iat\` int NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`refresh_token\` CHANGE \`token\` \`token\` varchar(500) NULL`);
   }
}
