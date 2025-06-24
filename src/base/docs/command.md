#. 1. redis-cli info clients
redis-cli config set maxclients 10000: Câu lệnh set maxclients

```ts
   # Clients
      connected_clients:2
      cluster_connections:0
      maxclients:10000 // Số lượng client connect đến Redis (1 Node đơn của Redis ít nhất phải chịu đc 10k req)
      client_recent_max_input_buffer:20480
      client_recent_max_output_buffer:0
      blocked_clients:0
      tracking_clients:0
      pubsub_clients:0
      watching_clients:0
      clients_in_timeout_table:0
      total_watched_keys:0
      total_blocking_keys:0
      total_blocking_keys_on_nokey:0
```
