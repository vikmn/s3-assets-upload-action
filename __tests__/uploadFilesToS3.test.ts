import fs from 'fs';
import path from 'path';
// eslint-disable-next-line import/no-extraneous-dependencies
import { mockClient } from 'aws-sdk-client-mock';
import { PutObjectCommand, PutObjectCommandOutput, S3Client } from '@aws-sdk/client-s3';
import { uploadFilesToS3 } from '../src/s3-asset-uploader';

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn().mockReturnValue('file content'),
    // eslint-disable-next-line sort-keys
    readdir: jest.fn(),
    stat: jest.fn().mockReturnValue({ isDirectory: () => false }),
  },
  readdirSync: jest.fn().mockReturnValue(['dir1', 'file1.svg']),
}));

jest.mock('path', () => ({
  join: jest.fn().mockReturnValue('testDir/file1.svg'),
  relative: jest.fn().mockReturnValue('file1.svg'),
  resolve: jest.fn().mockReturnValue('testDir/file1.svg'),
}));

const mockOf = (fn:any): jest.Mock => (fn as jest.Mock);

describe('upload-assets', () => {
  describe('an asset file from the root directory', () => {
    const sendMock = mockClient(S3Client);
    const mockFiles = ['testDir/file1.svg'];
    const mockStat = { isDirectory: () => false };

    beforeEach(() => {
      mockOf(fs.promises.readdir).mockResolvedValue(mockFiles);
      mockOf(fs.promises.stat).mockResolvedValue(mockStat);
      mockOf(fs.readdirSync).mockReturnValue(mockFiles);

      mockOf(fs.promises.readFile).mockResolvedValue('file content');
      mockOf(path.relative).mockReturnValue('file1.svg');
      sendMock.on(PutObjectCommand).resolves({ } as PutObjectCommandOutput);
    });

    it('is uploaded to S3', async () => {
      const uploadResults = await uploadFilesToS3('body-panel-assets');

      expect(uploadResults['testDir/file1.svg']).toEqual('s3://body-panel-assets/asset/cars/1.0/file1.svg');
    });
  });

  describe('An asset file from a sub directory', () => {
    const sendMock = mockClient(S3Client);
    const mockFiles = ['testDir/dir1'];
    const mockStat = { isDirectory: () => true };

    beforeEach(() => {
      const subDirFileName = 'dir1/file2.svg';
      mockOf(fs.promises.readdir)
        .mockResolvedValue([`testDir/${subDirFileName}`])
        .mockResolvedValueOnce(mockFiles);
      mockOf(fs.promises.stat).mockResolvedValueOnce(mockStat);
      mockOf(fs.readdirSync)
        .mockReturnValue([subDirFileName])
        .mockReturnValueOnce(mockFiles);

      mockOf(fs.promises.readFile).mockResolvedValue('file content');
      mockOf(path.relative).mockReturnValue(subDirFileName);
      mockOf(path.resolve).mockReturnValue(subDirFileName);
      sendMock.on(PutObjectCommand).resolves({ } as PutObjectCommandOutput);
    });

    it('is uploaded to S3', async () => {
      const uploadResults = await uploadFilesToS3('body-panel-assets');
      // eslint-disable-next-line no-console
      expect(uploadResults['dir1/file2.svg']).toEqual('s3://body-panel-assets/asset/cars/1.0/dir1/file2.svg');
    });
  });
});
