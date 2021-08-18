rm -rf demos/js
npm run build
aws s3 sync demos s3://wind-es/demos
aws s3 cp index.html s3://wind-es
npm run open
