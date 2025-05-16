import {faker} from '@faker-js/faker';
import {createHash} from 'crypto';
import mysql from 'mysql2';
const pool = mysql.createPool({
   host: 'localhost',
   user: 'root',
   port: 8811,
   password: 'thailq',
   database: 'shopDev_NESTJS',
});

const batchSize = 100000; // Số lượng record mỗi lần insert (adjust batch size)
const totalSize = 10_000_000; // Tổng số lượng record cần insert

function sha256(content: string) {
   return createHash('sha256').update(content).digest('hex');
}

function hashPassword(password: string) {
   return sha256(password + 'secret_password');
}
console.time(':::::TIMER:::::');
let currentId = 1;
const insertBatch = async () => {
   const values: (string | number | Date)[][] = [];
   const startDate = new Date('2025-01-01').getTime();
   const endDate = new Date('2025-05-07').getTime();
   const hashedPassword = hashPassword('123123');
   for (let i = 0; i < batchSize && currentId <= totalSize; i++) {
      const lastLoginTimestamp = Math.floor(faker.date.recent({days: 30}).getTime() / 1000);
      const createdAt = new Date(faker.number.int({min: startDate, max: endDate}));
      const usr_username: string = `name-${currentId}`;
      const usr_email = `email-${currentId}@gmail.com`;
      const usr_password = hashedPassword;
      const usr_gender = faker.helpers.arrayElement([1, 0]);
      const usr_phone = faker.phone.number().substring(0, 10);
      const usr_avatar = faker.image.avatar();
      const usr_date_of_birth = faker.date.birthdate({min: 18, max: 30, mode: 'age'});
      const usr_last_login_at = lastLoginTimestamp;
      const usr_last_login_ip_at = faker.internet.ipv4().substring(0, 12);
      const usr_login_times = faker.number.int({min: 0, max: 100});
      const status = faker.helpers.arrayElement(['Pending', 'Active']);
      const created_at = createdAt;
      const updated_at = createdAt;
      values.push([
         currentId,
         usr_username,
         usr_email,
         usr_password,
         usr_gender,
         usr_phone,
         usr_avatar,
         usr_date_of_birth,
         usr_last_login_at,
         usr_last_login_ip_at,
         usr_login_times,
         status,
         created_at,
         updated_at,
      ]);
      currentId++;
   }

   if (!values.length) {
      console.timeEnd(':::::TIMER:::::');
      pool.end((err) => {
         if (err) {
            console.error('Error when closing connection: ', err);
         } else {
            console.log(`Connection pool closed successfully`);
         }
      });
      return;
   }

   const sql =
      'INSERT INTO user (usr_id, usr_username, usr_email, usr_password, usr_gender, usr_phone, usr_avatar, usr_date_of_birth, usr_last_login_at, usr_last_login_ip_at, usr_login_times, status, created_at, updated_at) VALUES ?';
   pool.query(sql, [values], async (err, result) => {
      if (err) throw err;
      const resultHeader = result as mysql.ResultSetHeader;
      console.log(`Inserted ${resultHeader.affectedRows} records`);
      await insertBatch();
   });
};

insertBatch().catch(console.error);
