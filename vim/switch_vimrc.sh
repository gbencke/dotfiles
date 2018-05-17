#!/bin/bash


if test "$#" -ne 1;
then echo 'Need to specify the vimrc to use. Options are: regular, js, python' ; exit -1
fi

VIMRC_FILE=''
if test "$1" == 'regular';
then VIMRC_FILE=~/git/dotfiles/vim/vimrc
fi

if test "$1" == 'js';
then VIMRC_FILE=~/git/dotfiles/vim/vimrc_javascript
fi

if test "$1" == 'python';
then VIMRC_FILE=~/git/dotfiles/vim/vimrc_python
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


if test "$1" == 'python';
then cd ~/.vim/plugged/YouCompleteMe; ./install.sh
fi

