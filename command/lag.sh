#!/bin/bash

GROUP=${1:-NESTJS-ECOM-server}
BOOTSTRAP_SERVER=${2:-localhost:9092}
CONTAINER_NAME=kafka1

echo "🔍 Checking consumer lag for group: $GROUP"
echo "📡 Bootstrap server: $BOOTSTRAP_SERVER"
echo "🐳 Container: $CONTAINER_NAME"
echo "----------------------------------------"

# Check LAG
# docker exec -it $CONTAINER_NAME bash -c "
#   /opt/bitnami/kafka/bin/kafka-consumer-groups.sh \
#     --bootstrap-server $BOOTSTRAP_SERVER \
#     --group $GROUP \
#     --describe
# "
docker exec -it $CONTAINER_NAME bash -c "kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --all-groups"

