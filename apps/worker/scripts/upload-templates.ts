
import { createS3Client, putObjectFile, readS3ConfigFromEnv } from '@repo/storage';
import fs from 'fs/promises';
import path from 'path';

const XLSX_CONTENT = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

async function uploadTemplates() {
  const s3cfg = readS3ConfigFromEnv();
  if (!s3cfg) {
    console.error('S3 is not configured. Please set S3_BUCKET and AWS credentials.');
    process.exit(1);
  }

  const client = createS3Client(s3cfg);
  const templatesDir = path.resolve(process.cwd(), '../../packages/templates');
  
  try {
    const files = await fs.readdir(templatesDir);
    for (const file of files) {
      if (file.endsWith('.xlsx')) {
        const filePath = path.join(templatesDir, file);
        const key = `excel/templates/${file}`;
        
        console.log(`Uploading ${file} to s3://${s3cfg.bucket}/${key}...`);
        
        await putObjectFile({
          client,
          bucket: s3cfg.bucket,
          key,
          filePath,
          contentType: XLSX_CONTENT,
        });
        
        console.log(`Successfully uploaded ${file}.`);
      }
    }
    console.log('\nAll templates uploaded successfully.');
    console.log('Please update your .env file with the following keys:');
    console.log(`S3_VOUCHER_FORM_TEMPLATE_KEY=excel/templates/phieu_nhap_kho.xlsx`);
    console.log(`S3_VOUCHER_LIST_TEMPLATE_KEY=excel/templates/danh_sach_phieu_nhap_kho.xlsx`);

  } catch (error) {
    console.error('Error uploading templates:', error);
    process.exit(1);
  }
}

uploadTemplates();
