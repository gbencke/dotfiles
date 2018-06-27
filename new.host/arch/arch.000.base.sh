#!/bin/bash
# Tested with Base AMI: ami-4b17a034

sudo pacman -Sy --noconfirm sudo git curl tmux vim mc tig python2 python2-pip p7zip htop mc wget unzip
sudo pacman -Sy --noconfirm tree nano dos2unix bc python python-pip cmake graphviz python-h5py ctags 
sudo pacman -Sy --noconfirm rsync ranger go compton virtualgl termite i3 i3status i3blocks sddm feh tigervnc ttf-inconsolata

groupadd gbencke
useradd -m -g gbencke  -s /bin/bash gbencke
echo "gbencke  ALL=(ALL) ALL" >> /etc/sudoers

git config --global user.email "gbencke@benckesoftware.com.br"  
git config --global user.name "Guilherme Bencke"  
git config --global push.default simple
git config --global core.editor vim

pip2 install autopep8 pylint virtualenv pmm
pip install autopep8 pylint virtualenv pmm

curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash

vncserver

mkdir -p /var/git/000.INFRA
chmod 755 -R /var/git 
chmod 755 /root
cd /var/git/000.INFRA
git clone http://github.com/gbencke/dotfiles/
mkdir -p ~/.config/termite
cp /var/git/000.INFRA/dotfiles/new.host/arch/termite/config ~/.config/termite/config
cp -r /var/git/000.INFRA/dotfiles/new.host/wallpaper ~/Wallpapers
cp /var/git/000.INFRA/dotfiles/new.host/arch/vnc/xstartup ~/.vnc/xstartup
cp /var/git/000.INFRA/dotfiles/new.host/arch/vnc/config ~/.vnc/config
mkdir -p ~/.config/i3/
cp /var/git/000.INFRA/dotfiles/new.host/arch/vnc/i3config ~/.config/i3/config
cat /var/git/000.INFRA/dotfiles/shells/bashrc >> ~/.bashrc

vncserver -kill :1
vncserver

passwd gbencke
su gbencke
cd
ln -s /var/git ~/git 
unset NVM_DIR 2>/dev/null
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash
git config --global user.email "gbencke@benckesoftware.com.br"  
git config --global user.name "Guilherme Bencke"  
git config --global push.default simple
git config --global core.editor vim
cat /var/git/000.INFRA/dotfiles/shells/bashrc >> ~/.bashrc
