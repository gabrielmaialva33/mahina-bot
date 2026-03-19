#!/bin/bash
# Run this on the VPS to set up Watchtower for auto-deploy
# Monitors mahina-bot and mahina-lavalink containers for image updates

docker run -d \
  --name watchtower \
  --restart unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower \
  --cleanup \
  --interval 120 \
  mahina-bot mahina-lavalink

echo "✅ Watchtower running — checks for new images every 2 minutes"
echo "   Monitors: mahina-bot, mahina-lavalink"
echo "   Logs: docker logs watchtower"
