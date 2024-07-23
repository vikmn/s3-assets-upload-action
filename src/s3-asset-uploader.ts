import fs from 'fs';
import path from 'path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import * as core from '@actions/core'


const BASE_PATH = './assets/cars';

const logCurrentDirectoryFiles = (dir: string): void => {
  const files = fs.readdirSync(dir);
  core.debug(`Current directory: ${dir}`);
  files.forEach((file) => {
    core.debug(`File:${path.join(dir, file)}`);
  });
};

export const getAllFiles = async (dir: string): Promise<string[]> => {
  const subDirs = fs.readdirSync(dir);
  const files = await Promise.all(subDirs.map(async (subDir) => {
    const absolutePath = path.resolve(dir, subDir);
    const isDirectory = (await fs.promises.stat(absolutePath)).isDirectory();
    return isDirectory ? getAllFiles(absolutePath) : [absolutePath];
  }));
  // @ts-ignore
  return files.reduce((a, f) => a.concat(f), []);
};

export const uploadFilesToS3 = async (s3BucketName: string): Promise<Record<string, string>> => {
  const basePath = BASE_PATH;
  core.debug(__dirname);
  const s3Client = new S3Client({ region: 'eu-west-1' });
  const fileUploads:Record<string, string> = {};

  try {
    logCurrentDirectoryFiles(basePath);
    const allFiles = await getAllFiles(basePath);
    for (const filePath of allFiles) {
      const relativePath = path.relative(basePath, filePath);
      const s3Key = `asset/cars/1.0/${relativePath}`;
      core.debug(s3Key);
      const fileContent = await fs.promises.readFile(filePath);
      const params = {
        Body: fileContent,
        Bucket: s3BucketName,
        // Set the Content-Type to svg
        CacheControl: 'max-age=31536000',

        ContentType: 'image/svg+xml',
        Key: s3Key, // Set the Cache-Control header to cache the asset for 1 year
      };
      core.debug(`${params}`);

      const res = await s3Client.send(new PutObjectCommand(params));
      core.debug(`${res}`);
      core.debug(`Successfully uploaded ${filePath} to s3://${s3BucketName}/${s3Key}`);
      fileUploads[filePath] = `s3://${s3BucketName}/${s3Key}`;
    }

    core.debug('Successfully uploaded all files from assets folder');
  } catch (err) {
    core.setFailed(`Error uploading files to S3: ${err}`);
  }
  return fileUploads;
};
