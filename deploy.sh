rm -rf dist
npm run build
aws s3 sync dist s3://wind-es/demos
