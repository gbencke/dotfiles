#!/bin/bash

rm -rf ~/.vim*
cp ~/git/dotfiles/vimrc ~/.vimrc


curl -fLo ~/.vim/autoload/plug.vim --create-dirs \
    https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim



