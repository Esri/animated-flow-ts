rm -rf dist
npm run build-apps
npm run build-workers
aws s3 sync dist s3://wind-es/demos
