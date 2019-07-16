#!/bin/bash

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

nvm install v8.11.2
nvm use v8.11.2

npm install -g bower gulp webpack angcli grunt sass js-beautify 
npm install -g typescript-formatter prettier markserv standard 
npm install -g jsonlint fixjson htmlhint scss-lint sass-lint 
npm install -g create-react-app react-native-cli react-devtools
npm install -g sass scss-lint stylelint stylelint-config-standard
npm install -g stylelint-config-standard prettier tslint
