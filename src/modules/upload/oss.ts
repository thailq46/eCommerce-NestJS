import * as fs from 'fs';
import * as multer from 'multer';

const storage = multer.diskStorage({
   destination: function (req, file, cb) {
      try {
         fs.mkdirSync('uploads', {recursive: true});
      } catch (error) {
         console.log('Error creating directory:', error);
      }
      cb(null, 'uploads');
   },
   filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9) + '-' + file.originalname;
      cb(null, uniqueSuffix);
   },
});

export {storage as multerStorage};
