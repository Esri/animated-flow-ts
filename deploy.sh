rm -rf dist
webpack
cp *.html / dist
aws s3 sync dist s3://wind-es/demos
