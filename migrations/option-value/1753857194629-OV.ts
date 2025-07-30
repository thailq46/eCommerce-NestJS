import { MigrationInterface, QueryRunner } from "typeorm";

export class OV1753857194629 implements MigrationInterface {
    name = 'OV1753857194629'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`option_value\` ADD \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`option_value\` ADD \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`option_value\` ADD \`deleted_at\` datetime(6) NULL`);
        await queryRunner.query(`ALTER TABLE \`option_value\` ADD \`is_deleted\` tinyint NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`option_value\` DROP COLUMN \`value\``);
        await queryRunner.query(`ALTER TABLE \`option_value\` ADD \`value\` varchar(255) NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`option_value\` DROP COLUMN \`value\``);
        await queryRunner.query(`ALTER TABLE \`option_value\` ADD \`value\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`option_value\` DROP COLUMN \`is_deleted\``);
        await queryRunner.query(`ALTER TABLE \`option_value\` DROP COLUMN \`deleted_at\``);
        await queryRunner.query(`ALTER TABLE \`option_value\` DROP COLUMN \`updated_at\``);
        await queryRunner.query(`ALTER TABLE \`option_value\` DROP COLUMN \`created_at\``);
    }

}
