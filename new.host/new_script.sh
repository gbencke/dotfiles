#!/bin/bash

sudo apt-get update;

sudo apt-get install net-tools git build-essential gitk gdb tcl8.5 arandr curl tmux vim mc tig openssh* p7zip-full htop vim mc tig git make gcc build-essential curl tmux wget python-pip tree
sudo apt-get install language-pack-en-base 
sudo dpkg-reconfigure locales

curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.5/install.sh | bash ;

sudo -E add-apt-repository ppa:webupd8team/java
sudo -E add-apt-repository ppa:webupd8team/sublime-text-3 
sudo -E apt-get update
sudo -E apt-get install oracle-java8-installer
sudo -E apt-get install oracle-java8-set-default

curl -fLo ~/.vim/autoload/plug.vim --create-dirs \
    https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim

nvm install v4.6.0
nvm use v4.6.0

npm install -g bower gulp webpack angcli grunt sass js-beautify typescript-formatter 

mkdir git
cd git
git clone https://github.com/gbencke/dotfiles.git
cp dotfiles/vimrc ~/.vimrc
#enter vim and type :PlugInstall

sudo systemctl disable lightdm.service



