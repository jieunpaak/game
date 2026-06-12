#!/bin/bash
export PATH="/Users/jerry/.nvm/versions/node/v24.13.0/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
exec /Users/jerry/.nvm/versions/node/v24.13.0/bin/node \
     /Users/jerry/.nvm/versions/node/v24.13.0/bin/serve \
     /Users/jerry/dev/game/dist -p 3000
