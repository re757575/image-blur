下載 docker image
```
docker pull google/cloud-sdk
```

檢查是否可用
```
docker run -ti --rm google/cloud-sdk:latest gcloud version
```

身份認證並儲存憑證在 gcloud-config 容器
```
docker run -ti --name gcloud-config google/cloud-sdk gcloud auth login
```

設定專案
```
docker run --rm -ti --volumes-from gcloud-config google/cloud-sdk gcloud config set project cloud-functions-d6d13
```

設定 bucket
```
docker run --rm -ti --volumes-from gcloud-config google/cloud-sdk gsutil mb gs://image-input-bucket
docker run --rm -ti --volumes-from gcloud-config google/cloud-sdk gsutil mb gs://image-output-bucket
```

上傳 function
```
docker run --rm -ti --volumes-from gcloud-config -v /${PWD}:/home google/cloud-sdk /bin/bash -c "cd /home && gcloud functions deploy blurOffensiveImages --runtime nodejs10 --trigger-bucket image-input-bucket --set-env-vars BLURRED_BUCKET_NAME=image-output-bucket"
```

上傳 image 到 bucket
```
docker run --rm -ti --volumes-from gcloud-config -v /${PWD}:/home google/cloud-sdk /bin/bash -c "cd /home && gsutil cp zombie.jpg gs://image-input-bucket"
```

查看 logs
```
docker run --rm -ti --volumes-from gcloud-config google/cloud-sdk gcloud functions logs read --limit 100
```

刪除 functions
```
docker run --rm -ti --volumes-from gcloud-config google/cloud-sdk gcloud functions delete blurOffensiveImages
```

local run
```
docker run --rm -ti --volumes-from gcloud-config -v /${PWD}:/home google/cloud-sdk /bin/bash -c "cd /home && export GOOGLE_APPLICATION_CREDENTIALS="/home/google_application_credentials/cloud-functions-bdbfa45d1e93.json" && apt-get install nodejs -y && node index.js"
```

local test
```
docker run --rm -ti --volumes-from gcloud-config -v /${PWD}:/home google/cloud-sdk /bin/bash -c "cd /home && export GOOGLE_APPLICATION_CREDENTIALS="/home/google_application_credentials/cloud-functions-bdbfa45d1e93.json" && apt-get install nodejs npm -y && npm test"
```
