import {BadRequestException, Injectable, InternalServerErrorException} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import {config} from 'src/base/config';
import {LoggingService} from 'src/base/logging';

@Injectable()
export class UploadService {
   constructor(private readonly loggingService: LoggingService) {}

   private readonly UPLOADS_DIR = config.UPLOAD_PATH;
   private readonly CHUNKS_PREFIX = 'chunks-';

   uploadAvatar(file: Express.Multer.File) {
      try {
         if (!file) {
            throw new BadRequestException('Không có file nào được upload');
         }

         // // Validate file type
         // const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
         // const extName = path.extname(file.originalname).toLowerCase();

         // if (!allowedExtensions.includes(extName)) {
         //    // Clean up uploaded file
         //    if (fs.existsSync(file.path)) {
         //       fs.unlinkSync(file.path);
         //    }
         //    throw new BadRequestException('Chỉ chấp nhận file ảnh (jpg, jpeg, png, gif)');
         // }

         // // Validate file size (3MB)
         // const maxSize = 3 * 1024 * 1024;
         // if (file.size > maxSize) {
         //    if (fs.existsSync(file.path)) {
         //       fs.unlinkSync(file.path);
         //    }
         //    throw new BadRequestException('File quá lớn. Kích thước tối đa 3MB');
         // }

         return {
            message: 'Upload avatar thành công',
            data: {
               file_path: file.path,
               file_name: file.filename,
               original_name: file.originalname,
               file_size: file.size,
               mime_type: file.mimetype,
            },
         };
      } catch (error) {
         this.loggingService.logger.default.error(`Upload avatar error: ${error}`, 'UploadService');
         if (error instanceof BadRequestException) {
            throw error;
         }
         throw new InternalServerErrorException(`Lỗi khi upload avatar: ${error.message}`);
      }
   }

   uploadLargeFileChunks(
      files: Array<Express.Multer.File>,
      uploadData: {
         name: string;
         chunkIndex: string;
         totalChunks: string;
         originalName: string;
      },
   ) {
      try {
         const {name, chunkIndex, totalChunks, originalName} = uploadData;

         if (!name || !chunkIndex || !totalChunks || !originalName) {
            throw new BadRequestException('Thiếu thông tin cần thiết: name, chunkIndex, totalChunks, originalName');
         }

         if (!files || files.length === 0) {
            throw new BadRequestException('Không có file nào được upload');
         }

         // Parse and validate chunk parameters
         const chunkIdx = parseInt(chunkIndex);
         const totalChks = parseInt(totalChunks);

         if (isNaN(chunkIdx) || isNaN(totalChks) || chunkIdx < 0 || totalChks <= 0) {
            throw new BadRequestException('chunkIndex và totalChunks phải là số hợp lệ');
         }

         if (chunkIdx >= totalChks) {
            throw new BadRequestException('chunkIndex không được lớn hơn hoặc bằng totalChunks');
         }

         // Create chunk directory
         const chunkDirName = this.getChunkDirectoryPath(name);
         this.ensureDirectoryExists(chunkDirName);

         // Process uploaded chunks
         const processedFiles = this.processUploadedChunks(files, chunkDirName, chunkIdx);

         return {
            message: 'Upload chunk thành công',
            data: {
               file_name: name,
               original_name: originalName,
               chunk_index: chunkIdx,
               total_chunks: totalChks,
               processed_files: processedFiles,
               chunk_directory: chunkDirName,
            },
         };
      } catch (error) {
         this.loggingService.logger.default.error(`Upload large file error: ${error}`, 'UploadService');
         if (error instanceof BadRequestException) {
            throw error;
         }
         throw new InternalServerErrorException(`Lỗi khi upload file: ${error.message}`);
      }
   }

   /**
    * Merge file chunks into final file
    */
   mergeFileChunks(fileName: string) {
      try {
         // Validate fileName
         if (!fileName || typeof fileName !== 'string') {
            throw new BadRequestException('Thiếu tham số fileName hoặc fileName không hợp lệ');
         }

         const chunkDirName = this.getChunkDirectoryPath(fileName);

         // Validate chunk directory
         this.validateChunkDirectory(chunkDirName);

         // Get and sort chunk files
         const chunkFiles = this.getAndSortChunkFiles(chunkDirName);

         if (chunkFiles.length === 0) {
            throw new BadRequestException('Không tìm thấy file chunk hợp lệ trong thư mục');
         }

         // Prepare output file path
         const originalName = this.extractOriginalFileName(fileName);
         const outputFilePath = path.join(this.UPLOADS_DIR, originalName);

         // Remove existing output file
         if (fs.existsSync(outputFilePath)) {
            fs.unlinkSync(outputFilePath);
         }

         // Merge chunks
         const totalSize = this.mergeChunksToFile(chunkDirName, chunkFiles, outputFilePath);

         // Clean up chunk directory
         this.cleanupChunkDirectory(chunkDirName);

         const filePath = `${config.HOST}/${this.UPLOADS_DIR}/${originalName}`;

         return {
            message: 'Merge file thành công',
            data: {
               file_name: originalName,
               file_path: filePath,
               total_size: totalSize,
               chunks_processed: chunkFiles.length,
               merged_at: new Date().toISOString(),
            },
         };
      } catch (error) {
         this.loggingService.logger.default.error(`Merge file error: ${error}`, 'UploadService');
         if (error instanceof BadRequestException) {
            throw error;
         }
         throw new InternalServerErrorException(`Lỗi khi merge file: ${error.message}`);
      }
   }

   cleanupAllChunkDirectories() {
      try {
         if (!fs.existsSync(this.UPLOADS_DIR)) {
            return {
               message: 'Thư mục uploads không tồn tại',
               data: {cleanedDirectories: 0},
            };
         }
         const items = fs.readdirSync(this.UPLOADS_DIR);
         const chunkDirs = items.filter((item) => {
            const itemPath = path.join(this.UPLOADS_DIR, item);
            return fs.statSync(itemPath).isDirectory() && item.startsWith(this.CHUNKS_PREFIX);
         });

         let cleanedCount = 0;
         const errors: any[] = [];

         for (const chunkDir of chunkDirs) {
            try {
               const chunkDirPath = path.join(this.UPLOADS_DIR, chunkDir);
               this.cleanupChunkDirectory(chunkDirPath);
               cleanedCount++;
            } catch (error) {
               errors.push({
                  directory: chunkDir,
                  error: error.message,
               });
            }
         }

         return {
            message: 'Cleanup chunk directories hoàn thành',
            data: {
               total_directories: chunkDirs.length,
               cleaned_directories: cleanedCount,
               errors,
            },
         };
      } catch (error) {
         this.loggingService.logger.default.error(`Cleanup chunks error: ${error}`, 'UploadService');
         throw new InternalServerErrorException(`Lỗi khi cleanup chunks: ${error.message}`);
      }
   }

   getUploadStatistics() {
      try {
         if (!fs.existsSync(this.UPLOADS_DIR)) {
            return {
               message: 'Thống kê upload',
               data: {
                  total_files: 0,
                  total_size: 0,
                  chunk_directories: 0,
                  upload_directory: this.UPLOADS_DIR,
               },
            };
         }

         const items = fs.readdirSync(this.UPLOADS_DIR);
         let totalFiles = 0;
         let totalSize = 0;
         let chunkDirectories = 0;

         for (const item of items) {
            const itemPath = path.join(this.UPLOADS_DIR, item);
            const stats = fs.statSync(itemPath);

            if (stats.isFile()) {
               totalFiles++;
               totalSize += stats.size;
            } else if (stats.isDirectory() && item.startsWith(this.CHUNKS_PREFIX)) {
               chunkDirectories++;
            }
         }

         return {
            message: 'Thống kê upload',
            data: {
               total_files: totalFiles,
               total_size: totalSize,
               total_size_formatted: this.formatFileSize(totalSize),
               chunk_directories: chunkDirectories,
               upload_directory: this.UPLOADS_DIR,
            },
         };
      } catch (error) {
         this.loggingService.logger.default.error(`Get statistics error: ${error}`, 'UploadService');
         throw new InternalServerErrorException(`Lỗi khi lấy thống kê: ${error.message}`);
      }
   }

   /*************** PRIVATE HELPER METHODS ********************/
   private getChunkDirectoryPath(fileName: string): string {
      return path.join(this.UPLOADS_DIR, `${this.CHUNKS_PREFIX}${fileName}`);
   }

   private ensureDirectoryExists(dirPath: string) {
      if (!fs.existsSync(dirPath)) {
         fs.mkdirSync(dirPath, {recursive: true});
      }
   }

   private processUploadedChunks(files: Array<Express.Multer.File>, chunkDirName: string, chunkIdx: number) {
      const processedFiles: any[] = [];

      for (let i = 0; i < files.length; i++) {
         const file = files[i];

         // Create chunk filename with proper ordering
         const chunkFileName = `chunk-${chunkIdx.toString().padStart(6, '0')}-${i}`;
         const chunkPath = path.join(chunkDirName, chunkFileName);

         // Move uploaded file to chunk directory
         if (fs.existsSync(file.path)) {
            fs.renameSync(file.path, chunkPath);
            processedFiles.push({
               chunkIndex: chunkIdx,
               chunkFileName,
               chunkPath,
               size: file.size,
            });
         } else {
            throw new InternalServerErrorException(`File chunk không tồn tại: ${file.path}`);
         }
      }

      return processedFiles;
   }

   private validateChunkDirectory(chunkDirName: string) {
      if (!fs.existsSync(chunkDirName)) {
         throw new BadRequestException(`Không tìm thấy thư mục chứa các chunk: ${chunkDirName}`);
      }

      if (!fs.statSync(chunkDirName).isDirectory()) {
         throw new BadRequestException(`${chunkDirName} không phải là thư mục`);
      }
   }

   private getAndSortChunkFiles(chunkDirName: string): string[] {
      const files = fs.readdirSync(chunkDirName);

      if (files.length === 0) {
         throw new BadRequestException('Không có file chunk nào trong thư mục');
      }

      // Filter and sort chunk files
      return files
         .filter((file) => file.startsWith('chunk-'))
         .sort((a, b) => {
            // Extract chunk index from filename (chunk-000001-0 format)
            const aIndex = parseInt(a.split('-')[1]);
            const bIndex = parseInt(b.split('-')[1]);
            return aIndex - bIndex;
         });
   }

   private extractOriginalFileName(fileName: string): string {
      // Format: timestamp-originalname.ext
      return fileName.substring(fileName.indexOf('-') + 1);
   }

   private mergeChunksToFile(chunkDirName: string, chunkFiles: string[], outputFilePath: string): number {
      let totalSize = 0;
      const writeStream = fs.createWriteStream(outputFilePath);

      for (const chunkFile of chunkFiles) {
         const chunkPath = path.join(chunkDirName, chunkFile);

         // Verify chunk file exists and is a file
         if (!fs.existsSync(chunkPath) || !fs.statSync(chunkPath).isFile()) {
            writeStream.destroy();
            if (fs.existsSync(outputFilePath)) {
               fs.unlinkSync(outputFilePath);
            }
            throw new BadRequestException(`Chunk file không hợp lệ: ${chunkFile}`);
         }

         // Read and append chunk to output file
         const chunkData = fs.readFileSync(chunkPath);
         writeStream.write(chunkData);
         totalSize += chunkData.length;
      }

      writeStream.end();
      return totalSize;
   }

   private cleanupChunkDirectory(chunkDirPath: string) {
      try {
         if (fs.existsSync(chunkDirPath)) {
            // Remove all files in the directory
            const files = fs.readdirSync(chunkDirPath);
            for (const file of files) {
               const filePath = path.join(chunkDirPath, file);
               if (fs.statSync(filePath).isFile()) {
                  fs.unlinkSync(filePath);
               }
            }
            // Remove the directory itself
            fs.rmdirSync(chunkDirPath);
         }
      } catch (error) {
         this.loggingService.logger.default.error(
            `Error cleaning up chunk directory ${chunkDirPath}: ${error}`,
            'UploadService',
         );
      }
   }

   private formatFileSize(bytes: number): string {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
   }
}
