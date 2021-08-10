rm -rf demos/js
npm run build
aws s3 sync demos s3://wind-es/demos
