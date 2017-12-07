#!/bin/bash

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
sudo add-apt-repository ppa:longsleep/golang-backports 
sudo add-apt-repository ppa:jonathonf/python-3.6
sudo apt-get update;

sudo apt-get install -y net-tools git build-essential gitk gdb tcl8.5 arandr curl tmux vim mc tig openssh* 
sudo apt-get install -y p7zip-full htop vim mc tig git make gcc build-essential curl tmux wget python-pip 
sudo apt-get install -y ncurses-dev exuberant-ctags tree python-dev nano golang-go dos2unix haskell-platform
sudo apt-get install -y texlive texlive-xetex
sudo apt-get install -y python3 python3-pip python3-dev 
sudo apt-get install -y python3.6 graphviz
sudo apt-get install -y docker-ce

sudo apt-get install language-pack-en-base 
sudo dpkg-reconfigure locales

curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.5/install.sh | bash ;
curl -s https://packagecloud.io/install/repositories/github/git-lfs/script.deb.sh | sudo bash;
sudo apt-get -y install git-lfs

sudo -E add-apt-repository ppa:webupd8team/java
sudo -E add-apt-repository ppa:webupd8team/sublime-text-3 
sudo -E apt-get update
sudo -E apt-get install oracle-java8-installer
sudo -E apt-get install oracle-java8-set-default

nvm install v4.6.0
nvm use v4.6.0

npm install -g bower gulp webpack angcli grunt sass js-beautify typescript-formatter 

cabal update
cabal install pandoc

mkdir git
cd git

git clone https://github.com/gbencke/dotfiles.git
cp dotfiles/vimrc ~/.vimrc

cd ~/git
git clone https://github.com/vim/vim.git
cd vim
git checkout v7.4.2367
./configure --enable-pythoninterp 
make clean && make && sudo make install

curl -fLo ~/.vim/autoload/plug.vim --create-dirs \
    https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim
#enter vim and type :PlugInstall

sudo pip install autopep8 pylint virtualenv pmm
sudo pip3 install autopep8 pylint virtualenv pmm

	
sudo systemctl disable lightdm.service





