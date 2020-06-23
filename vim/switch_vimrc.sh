#!/bin/bash

sudo xhost +

if test "$#" -ne 1;
then echo 'Need to specify the vimrc to use. Options are: regular, js, arch, python' ; exit -1
fi

VIMRC_FILE=''
if test "$1" == 'regular';
then VIMRC_FILE=./vimrc
fi

if test "$1" == 'js';
then VIMRC_FILE=./vimrc_javascript
fi

if test "$1" == 'arch';
then VIMRC_FILE=./vimrc_javascript_arch
fi

if test "$1" == 'python';
then VIMRC_FILE=./vimrc_python
fi

if test "$1" == 'cpp';
then VIMRC_FILE=./vimrc_cpp
fi

if test "$VIMRC_FILE" == '';
then echo 'This vimrc was not recognized...'; exit -1;
fi

echo "Using $VIMRC_FILE"

cp -f $VIMRC_FILE ~/.vimrc

rm -rf ~/.vim

curl -fLo ~/.vim/autoload/plug.vim --create-dirs \
        https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim

vim +PlugInstall +qall

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

if test "$1" == 'js' || test "$1" == "arch";
then nvm install v12.18.0 &&  npm install -g prettier typescript js-beautify gulp grunt jsonlint
fi

echo '{ "plugins" : { "node": {} } } ' > ~/.tern-config
