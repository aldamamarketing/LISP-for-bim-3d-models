@echo off

echo Deploying syncSuiteIdsOnGroupFile...
call gcloud functions deploy syncSuiteIdsOnGroupFile --project lispcentral --gen2 --runtime=nodejs22 --region=us-central1 --source="." --entry-point=syncSuiteIdsOnGroupFile --trigger-event-filters=type=google.cloud.firestore.document.v1.written --trigger-event-filters=database=(default) --trigger-event-filters=namespace=(default) --trigger-event-filters=document=groupFiles/{gfileId}

echo Deploying onSuiteDeleted...
call gcloud functions deploy onSuiteDeleted --project lispcentral --gen2 --runtime=nodejs22 --region=us-central1 --source="." --entry-point=onSuiteDeleted --trigger-event-filters=type=google.cloud.firestore.document.v1.deleted --trigger-event-filters=database=(default) --trigger-event-filters=namespace=(default) --trigger-event-filters=document=suites/{suiteId}

echo Deploying onGroupDeleted...
call gcloud functions deploy onGroupDeleted --project lispcentral --gen2 --runtime=nodejs22 --region=us-central1 --source="." --entry-point=onGroupDeleted --trigger-event-filters=type=google.cloud.firestore.document.v1.deleted --trigger-event-filters=database=(default) --trigger-event-filters=namespace=(default) --trigger-event-filters=document=groups/{groupId}

echo All functions deployed.
