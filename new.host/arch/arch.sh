#!/bin/bash

# Tested with Base AMI: ami-4b17a034	

sudo pacman -Sy --noconfirm git curl tmux vim mc tig 
sudo pacman -Sy --noconfirm python2 python2-pip 
sudo pacman -Sy --noconfirm p7zip htop mc wget 
sudo pacman -Sy --noconfirm tree nano dos2unix bc 
sudo pacman -Sy --noconfirm python python-pip cmake graphviz python-h5py
sudo pacman -Sy --noconfirm ctags rsync ranger go 

sudo pacman -Sy --noconfirm compton
sudo pacman -Sy --noconfirm virtualgl
sudo pacman -Sy --noconfirm i3 i3status i3blocks
sudo pacman -Sy --noconfirm termite
sudo pacman -Sy --noconfirm sddm
sudo pacman -Sy --noconfirm feh
sudo pacman -Sy --noconfirm tigervnc
sudo pacman -Sy --noconfirm ttf-inconsolata

vncserver

mkdir -p git/000.INFRA
cd git/000.INFRA
git clone http://github.com/gbencke/dotfiles/

mkdir -p ~/.config/termite

cp ~/git/000.INFRA/dotfiles/new.host/arch/termite/config ~/.config/termite/config
cp -r ~/git/000.INFRA/dotfiles/wallpaper ~/Wallpapers
cp ~/git/000.INFRA/dotfiles/new.host/arch/vnc/xstartup ~/.vnc/xstartup
cp ~/git/000.INFRA/dotfiles/new.host/arch/vnc/config ~/.vnc/config
mkdir -p ~/.config/i3/
cp ~/git/000.INFRA/dotfiles/new.host/arch/vnc/i3config ~/.config/i3/config


